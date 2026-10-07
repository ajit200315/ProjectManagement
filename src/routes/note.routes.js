import { Router } from "express";
import {
  createNote,
  deleteNote,
  getNoteById,
  getNotes,
  updateNote,
} from "../controller/note.controllers.js";
import { validateProjectPermission } from "../middlewares/auth.middleware.js";
import { validate } from "../middlewares/validator.middleware.js";
import { notesValidator } from "../validators/index.js";
import { UserRolesEnum } from "../utils/constant.js";

// Mounted under /api/v1/projects/:projectId/notes.
const router = Router({ mergeParams: true });

const anyMember = [
  UserRolesEnum.ADMIN,
  UserRolesEnum.PROJECT_ADMIN,
  UserRolesEnum.MEMBER,
];

router
  .route("/")
  .get(validateProjectPermission(anyMember), getNotes)
  .post(
    validateProjectPermission([UserRolesEnum.ADMIN]),
    notesValidator(),
    validate,
    createNote,
  );

router
  .route("/:noteId")
  .get(validateProjectPermission(anyMember), getNoteById)
  .put(
    validateProjectPermission([UserRolesEnum.ADMIN]),
    notesValidator(),
    validate,
    updateNote,
  )
  .delete(validateProjectPermission([UserRolesEnum.ADMIN]), deleteNote);

export default router;
