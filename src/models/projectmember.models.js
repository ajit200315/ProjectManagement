import mongoose, { Schema } from "mongoose";
import { AvailableUserRoles, UserRolesEnum } from "../utils/constant.js";

const projectMemberSchema = new Schema(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    project: {
      type: Schema.Types.ObjectId,
      ref: "Project",
      required: true,
    },
    role: {
      type: String,
      enum: AvailableUserRoles,
      default: UserRolesEnum.MEMBER,
    },
  },
  { timestamps: true },
);

// A user can hold at most one role per project.
projectMemberSchema.index({ project: 1, user: 1 }, { unique: true });

export const ProjectMember = mongoose.model(
  "ProjectMember",
  projectMemberSchema,
);
