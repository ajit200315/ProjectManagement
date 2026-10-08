import { Router } from "express";
import {
  addMembersToProject,
  createProject,
  deleteMember,
  deleteProject,
  getProjectById,
  getProjectMembers,
  getProjects,
  updateMemberRole,
  updateProject,
} from "../controller/project.controllers.js";
import {
  requireVerifiedEmail,
  validateProjectPermission,
  verifyJWT,
} from "../middlewares/auth.middleware.js";
import { validate } from "../middlewares/validator.middleware.js";
import {
  addMemberToProjectValidator,
  createProjectValidator,
  mongoIdPathVariableValidator,
  updateMemberRoleValidator,
} from "../validators/index.js";
import { UserRolesEnum } from "../utils/constant.js";
import taskRouter from "./task.routes.js";
import noteRouter from "./note.routes.js";

const router = Router();

// Applies to this router and to the nested task/note routers below, so
// those do not repeat the check.
router.use(verifyJWT);

// Reads stay open to an unverified account; anything that changes data does
// not. Covers the nested task, note and attachment routers too.
router.use((req, res, next) =>
  req.method === "GET" ? next() : requireVerifiedEmail(req, res, next),
);

router
  .route("/")
  .get(getProjects)
  .post(createProjectValidator(), validate, createProject);

router
  .route("/:projectId")
  .get(
    validateProjectPermission([
      UserRolesEnum.ADMIN,
      UserRolesEnum.PROJECT_ADMIN,
      UserRolesEnum.MEMBER,
    ]),
    getProjectById,
  )
  .put(
    validateProjectPermission([UserRolesEnum.ADMIN]),
    createProjectValidator(),
    validate,
    updateProject,
  )
  .delete(validateProjectPermission([UserRolesEnum.ADMIN]), deleteProject);

router
  .route("/:projectId/members")
  .get(
    validateProjectPermission([
      UserRolesEnum.ADMIN,
      UserRolesEnum.PROJECT_ADMIN,
      UserRolesEnum.MEMBER,
    ]),
    getProjectMembers,
  )
  .post(
    validateProjectPermission([UserRolesEnum.ADMIN]),
    addMemberToProjectValidator(),
    validate,
    addMembersToProject,
  );

router
  .route("/:projectId/members/:userId")
  .put(
    validateProjectPermission([UserRolesEnum.ADMIN]),
    mongoIdPathVariableValidator("userId"),
    updateMemberRoleValidator(),
    validate,
    updateMemberRole,
  )
  .delete(
    validateProjectPermission([UserRolesEnum.ADMIN]),
    mongoIdPathVariableValidator("userId"),
    validate,
    deleteMember,
  );

// Nested resources: /api/v1/projects/:projectId/tasks and /notes
router.use("/:projectId/tasks", taskRouter);
router.use("/:projectId/notes", noteRouter);

export default router;
