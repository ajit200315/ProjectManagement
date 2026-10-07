import mongoose, { Schema } from "mongoose";

const projectSchema = new Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  { timestamps: true },
);

// Project names are unique per owner, not globally.
projectSchema.index({ createdBy: 1, name: 1 }, { unique: true });

export const Project = mongoose.model("Project", projectSchema);
