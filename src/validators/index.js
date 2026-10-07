import { body, param } from "express-validator";
import { AvailableTaskStatus, AvailableUserRoles } from "../utils/constant.js";

const userRegisterValidator = () => {
  return [
    body("email")
      .trim()
      .notEmpty()
      .withMessage("Email is required")
      .isEmail()
      .withMessage("Email is invalid"),
    body("username")
      .trim()
      .notEmpty()
      .withMessage("username is required")
      .isLowercase()
      .withMessage("Username must be in lower case")
      .isLength({ min: 3 })
      .withMessage("Username must be at atleast 3 characters long"),
    body("password")
      .trim()
      .notEmpty()
      .withMessage("Password is required")
      .isLength({ min: 8 })
      .withMessage("Password must be at least 8 characters long"),
    body("fullName").optional().trim(),
  ];
};

const userLoginValidator = () => {
  return [
    body("email").optional().isEmail().withMessage("Email is not valid"),
    body("username").optional().trim(),
    body("password").notEmpty().withMessage("Password is required"),
  ];
};

const userChangeCurrentPasswordValidator = () => {
  return [
    body("oldPassword").notEmpty().withMessage("Old password is required"),
    body("newPassword")
      .notEmpty()
      .withMessage("New password is required")
      .isLength({ min: 8 })
      .withMessage("Password must be at least 8 characters long"),
  ];
};

const userForgotPasswordValidator = () => {
  return [
    body("email")
      .notEmpty()
      .withMessage("Email is required")
      .isEmail()
      .withMessage("Email is invalid"),
  ];
};

const userResetForgotPasswordValidator = () => {
  return [
    body("newPassword")
      .notEmpty()
      .withMessage("Password is required")
      .isLength({ min: 8 })
      .withMessage("Password must be at least 8 characters long"),
  ];
};

const createProjectValidator = () => {
  return [
    body("name").trim().notEmpty().withMessage("Name is required"),
    body("description").optional().trim(),
  ];
};

const addMemberToProjectValidator = () => {
  return [
    body("email")
      .trim()
      .notEmpty()
      .withMessage("Email is required")
      .isEmail()
      .withMessage("Email is invalid"),
    body("role")
      .optional()
      .isIn(AvailableUserRoles)
      .withMessage("Role is invalid"),
  ];
};

const updateMemberRoleValidator = () => {
  return [
    body("newRole")
      .notEmpty()
      .withMessage("Role is required")
      .isIn(AvailableUserRoles)
      .withMessage("Role is invalid"),
  ];
};

const createTaskValidator = () => {
  return [
    body("title").trim().notEmpty().withMessage("Title is required"),
    body("description").optional().trim(),
    body("assignedTo")
      .optional()
      .isMongoId()
      .withMessage("Assignee id is invalid"),
    body("status")
      .optional()
      .isIn(AvailableTaskStatus)
      .withMessage("Status is invalid"),
  ];
};

const updateTaskValidator = () => {
  return [
    body("title").optional().trim().notEmpty().withMessage("Title is required"),
    body("description").optional().trim(),
    body("assignedTo")
      // null is how the client clears an assignee; the default optional()
      // only skips undefined, so null would be rejected as a bad id.
      .optional({ values: "null" })
      .isMongoId()
      .withMessage("Assignee id is invalid"),
    body("status")
      .optional()
      .isIn(AvailableTaskStatus)
      .withMessage("Status is invalid"),
  ];
};

const createSubTaskValidator = () => {
  return [body("title").trim().notEmpty().withMessage("Title is required")];
};

const updateSubTaskValidator = () => {
  return [
    body("title").optional().trim().notEmpty().withMessage("Title is required"),
    body("isCompleted")
      .optional()
      .isBoolean()
      .withMessage("isCompleted must be a boolean"),
  ];
};

const notesValidator = () => {
  return [body("content").trim().notEmpty().withMessage("Content is required")];
};

/** Rejects a malformed id with a 422 before it reaches a controller. */
const mongoIdPathVariableValidator = (idName) => {
  return [
    param(idName).notEmpty().isMongoId().withMessage(`Invalid ${idName}`),
  ];
};

export {
  userRegisterValidator,
  userLoginValidator,
  userChangeCurrentPasswordValidator,
  userForgotPasswordValidator,
  userResetForgotPasswordValidator,
  createProjectValidator,
  addMemberToProjectValidator,
  updateMemberRoleValidator,
  createTaskValidator,
  updateTaskValidator,
  createSubTaskValidator,
  updateSubTaskValidator,
  notesValidator,
  mongoIdPathVariableValidator,
};
