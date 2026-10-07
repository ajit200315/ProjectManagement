import mongoose, { Schema } from "mongoose";
import {
  AvailableTaskPriorities,
  AvailableTaskStatus,
  TaskPriorityEnum,
  TaskStatusEnum,
} from "../utils/constant.js";

const taskSchema = new Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },
    description: String,
    project: {
      type: Schema.Types.ObjectId,
      ref: "Project",
      required: true,
    },
    assignedTo: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
    assignedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
    status: {
      type: String,
      enum: AvailableTaskStatus,
      default: TaskStatusEnum.TODO,
    },
    priority: {
      type: String,
      enum: AvailableTaskPriorities,
      default: TaskPriorityEnum.MEDIUM,
    },
    dueDate: {
      type: Date,
    },
    attachments: {
      type: [
        {
          url: String,
          mimetype: String,
          size: Number,
        },
      ],
      default: [],
    },
  },
  { timestamps: true },
);

// Boards are read far more than written, and nearly every read is "the tasks
// in this project", often narrowed by status or sorted by when they are due.
taskSchema.index({ project: 1, status: 1 });
taskSchema.index({ project: 1, dueDate: 1 });

export const Task = mongoose.model("Task", taskSchema);
