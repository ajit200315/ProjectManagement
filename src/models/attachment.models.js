import mongoose, { Schema } from "mongoose";

/**
 * Attachment bytes live in their own collection rather than inside the task.
 *
 * Embedding them would push task documents toward the 16MB BSON ceiling and
 * make every board query drag the file contents along with it. Keeping them
 * separate means `data` is only ever read by the download route.
 */
const attachmentSchema = new Schema(
  {
    task: {
      type: Schema.Types.ObjectId,
      ref: "Task",
      required: true,
      index: true,
    },
    // Denormalized so a download can be authorized without loading the task.
    project: {
      type: Schema.Types.ObjectId,
      ref: "Project",
      required: true,
    },
    uploadedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    filename: {
      type: String,
      required: true,
      trim: true,
    },
    mimetype: {
      type: String,
      required: true,
    },
    size: {
      type: Number,
      required: true,
    },
    data: {
      type: Buffer,
      required: true,
      // Never return the bytes on an ordinary query; only the download route
      // asks for them explicitly.
      select: false,
    },
  },
  { timestamps: true },
);

export const Attachment = mongoose.model("Attachment", attachmentSchema);
