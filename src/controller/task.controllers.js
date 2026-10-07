import mongoose from "mongoose";
import { ApiResponse } from "../utils/api-response.js";
import { ApiError } from "../utils/api-error.js";
import { asyncHandler } from "../utils/async-handler.js";
import { Task } from "../models/task.models.js";
import { SubTask } from "../models/subtask.models.js";
import { Attachment } from "../models/attachment.models.js";
import { ProjectMember } from "../models/projectmember.models.js";
import { getPagination, paginated } from "../utils/pagination.js";
import { TaskStatusEnum } from "../utils/constant.js";

/** Loads a task and asserts it belongs to the project on the URL. */
const findTaskInProject = async (taskId, projectId) => {
  const task = await Task.findOne({
    _id: taskId,
    project: new mongoose.Types.ObjectId(projectId),
  });

  if (!task) {
    throw new ApiError(404, "Task not found");
  }

  return task;
};

const SORTABLE = {
  createdAt: "createdAt",
  dueDate: "dueDate",
  title: "title",
  priority: "priority",
};

const getTasks = asyncHandler(async (req, res) => {
  const { projectId } = req.params;
  const { status, assignedTo, priority, overdue, sort, order } = req.query;

  const filter = { project: new mongoose.Types.ObjectId(projectId) };

  if (status) {
    filter.status = status;
  }
  if (priority) {
    filter.priority = priority;
  }
  if (assignedTo) {
    if (!mongoose.isValidObjectId(assignedTo)) {
      throw new ApiError(400, "Invalid assignedTo id");
    }
    filter.assignedTo = new mongoose.Types.ObjectId(assignedTo);
  }
  if (overdue === "true") {
    // Compared against a Date, not Date.now(): mongo brackets comparisons by
    // BSON type, so $lt with a number would never match a date field.
    filter.dueDate = { $lt: new Date() };
    filter.status = { $ne: TaskStatusEnum.DONE };
  }

  const sortField = SORTABLE[sort] ?? "createdAt";
  const direction = order === "asc" ? 1 : -1;

  const pagination = getPagination(req.query);

  const [tasks, total] = await Promise.all([
    Task.find(filter)
      .populate("assignedTo", "username fullName avatar")
      .populate("assignedBy", "username fullName avatar")
      .sort({ [sortField]: direction })
      .skip(pagination.skip)
      .limit(pagination.limit),
    Task.countDocuments(filter),
  ]);

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        paginated(tasks, pagination, total),
        "Tasks fetched successfully",
      ),
    );
});

const getTaskById = asyncHandler(async (req, res) => {
  const { projectId, taskId } = req.params;

  const task = await Task.findOne({
    _id: taskId,
    project: new mongoose.Types.ObjectId(projectId),
  })
    .populate("assignedTo", "username fullName avatar")
    .populate("assignedBy", "username fullName avatar");

  if (!task) {
    throw new ApiError(404, "Task not found");
  }

  const [subtasks, attachments] = await Promise.all([
    SubTask.find({ task: task._id }).sort({ createdAt: 1 }),
    Attachment.find({ task: task._id })
      .populate("uploadedBy", "username fullName")
      .sort({ createdAt: -1 }),
  ]);

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        { ...task.toObject(), subtasks, attachments },
        "Task fetched",
      ),
    );
});

const createTask = asyncHandler(async (req, res) => {
  const { projectId } = req.params;
  const { title, description, assignedTo, status, priority, dueDate } =
    req.body;

  // A task may only be assigned to someone who is on the project.
  if (assignedTo) {
    const member = await ProjectMember.findOne({
      project: new mongoose.Types.ObjectId(projectId),
      user: new mongoose.Types.ObjectId(assignedTo),
    });
    if (!member) {
      throw new ApiError(400, "Assignee is not a member of this project");
    }
  }

  const task = await Task.create({
    title,
    description,
    project: new mongoose.Types.ObjectId(projectId),
    assignedTo: assignedTo ?? undefined,
    assignedBy: new mongoose.Types.ObjectId(req.user._id),
    status,
    priority,
    dueDate: dueDate || undefined,
  });

  return res
    .status(201)
    .json(new ApiResponse(201, task, "Task created successfully"));
});

const updateTask = asyncHandler(async (req, res) => {
  const { projectId, taskId } = req.params;
  const { title, description, assignedTo, status, priority, dueDate } =
    req.body;

  await findTaskInProject(taskId, projectId);

  if (assignedTo) {
    const member = await ProjectMember.findOne({
      project: new mongoose.Types.ObjectId(projectId),
      user: new mongoose.Types.ObjectId(assignedTo),
    });
    if (!member) {
      throw new ApiError(400, "Assignee is not a member of this project");
    }
  }

  // Only send the fields the caller actually supplied, so a partial
  // update cannot blank out the rest of the task.
  const updates = {};
  if (title !== undefined) updates.title = title;
  if (description !== undefined) updates.description = description;
  if (assignedTo !== undefined) updates.assignedTo = assignedTo;
  if (status !== undefined) updates.status = status;
  if (priority !== undefined) updates.priority = priority;
  // "" and null both mean "clear the date".
  if (dueDate !== undefined) updates.dueDate = dueDate || null;

  const updatedTask = await Task.findByIdAndUpdate(taskId, updates, {
    returnDocument: "after",
    runValidators: true,
  });

  return res
    .status(200)
    .json(new ApiResponse(200, updatedTask, "Task updated successfully"));
});

const deleteTask = asyncHandler(async (req, res) => {
  const { projectId, taskId } = req.params;

  const task = await findTaskInProject(taskId, projectId);

  await SubTask.deleteMany({ task: task._id });
  await Attachment.deleteMany({ task: task._id });
  await Task.findByIdAndDelete(task._id);

  return res
    .status(200)
    .json(new ApiResponse(200, task, "Task deleted successfully"));
});

const createSubTask = asyncHandler(async (req, res) => {
  const { projectId, taskId } = req.params;
  const { title } = req.body;

  const task = await findTaskInProject(taskId, projectId);

  const subtask = await SubTask.create({
    title,
    task: task._id,
    createdBy: new mongoose.Types.ObjectId(req.user._id),
  });

  return res
    .status(201)
    .json(new ApiResponse(201, subtask, "Subtask created successfully"));
});

const updateSubTask = asyncHandler(async (req, res) => {
  const { projectId, taskId, subTaskId } = req.params;
  const { title, isCompleted } = req.body;

  const task = await findTaskInProject(taskId, projectId);

  const updates = {};
  if (title !== undefined) updates.title = title;
  if (isCompleted !== undefined) updates.isCompleted = isCompleted;

  const subtask = await SubTask.findOneAndUpdate(
    { _id: subTaskId, task: task._id },
    updates,
    { returnDocument: "after", runValidators: true },
  );

  if (!subtask) {
    throw new ApiError(404, "Subtask not found");
  }

  return res
    .status(200)
    .json(new ApiResponse(200, subtask, "Subtask updated successfully"));
});

const deleteSubTask = asyncHandler(async (req, res) => {
  const { projectId, taskId, subTaskId } = req.params;

  const task = await findTaskInProject(taskId, projectId);

  const subtask = await SubTask.findOneAndDelete({
    _id: subTaskId,
    task: task._id,
  });

  if (!subtask) {
    throw new ApiError(404, "Subtask not found");
  }

  return res
    .status(200)
    .json(new ApiResponse(200, subtask, "Subtask deleted successfully"));
});

export {
  getTasks,
  getTaskById,
  createTask,
  updateTask,
  deleteTask,
  createSubTask,
  updateSubTask,
  deleteSubTask,
};
