import mongoose from "mongoose";
import { ApiResponse } from "../utils/api-response.js";
import { ApiError } from "../utils/api-error.js";
import { asyncHandler } from "../utils/async-handler.js";
import { Attachment } from "../models/attachment.models.js";
import { Task } from "../models/task.models.js";

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

const listAttachments = asyncHandler(async (req, res) => {
  const { projectId, taskId } = req.params;

  const task = await findTaskInProject(taskId, projectId);

  // `data` is select:false, so this returns metadata only.
  const attachments = await Attachment.find({ task: task._id })
    .populate("uploadedBy", "username fullName")
    .sort({ createdAt: -1 });

  return res
    .status(200)
    .json(new ApiResponse(200, attachments, "Attachments fetched"));
});

const uploadAttachment = asyncHandler(async (req, res) => {
  const { projectId, taskId } = req.params;

  if (!req.file) {
    throw new ApiError(400, "No file was uploaded");
  }

  const task = await findTaskInProject(taskId, projectId);

  const attachment = await Attachment.create({
    task: task._id,
    project: task.project,
    uploadedBy: new mongoose.Types.ObjectId(req.user._id),
    filename: req.file.originalname,
    mimetype: req.file.mimetype || "application/octet-stream",
    size: req.file.size,
    data: req.file.buffer,
  });

  const created = await Attachment.findById(attachment._id).populate(
    "uploadedBy",
    "username fullName",
  );

  return res
    .status(201)
    .json(new ApiResponse(201, created, "Attachment uploaded"));
});

const downloadAttachment = asyncHandler(async (req, res) => {
  const { projectId, taskId, attachmentId } = req.params;

  await findTaskInProject(taskId, projectId);

  const attachment = await Attachment.findOne({
    _id: attachmentId,
    task: new mongoose.Types.ObjectId(taskId),
  }).select("+data");

  if (!attachment) {
    throw new ApiError(404, "Attachment not found");
  }

  // Always a download, never rendered inline. These files are served from the
  // same origin as the app, so letting the browser display an uploaded HTML or
  // SVG file would run attacker markup in our own origin.
  res.setHeader("Content-Type", "application/octet-stream");
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader(
    "Content-Disposition",
    // The quoted form is for older clients; filename* carries the real,
    // percent-encoded name so non-ASCII filenames survive.
    `attachment; filename="${attachment.filename.replace(/[^\w.\-]/g, "_")}"; ` +
      `filename*=UTF-8''${encodeURIComponent(attachment.filename)}`,
  );
  res.setHeader("Content-Length", attachment.size);

  return res.send(attachment.data);
});

const deleteAttachment = asyncHandler(async (req, res) => {
  const { projectId, taskId, attachmentId } = req.params;

  await findTaskInProject(taskId, projectId);

  const attachment = await Attachment.findOneAndDelete({
    _id: attachmentId,
    task: new mongoose.Types.ObjectId(taskId),
  });

  if (!attachment) {
    throw new ApiError(404, "Attachment not found");
  }

  return res
    .status(200)
    .json(new ApiResponse(200, { _id: attachment._id }, "Attachment deleted"));
});

export {
  listAttachments,
  uploadAttachment,
  downloadAttachment,
  deleteAttachment,
};
