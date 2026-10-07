import { Router } from "express";
import {
  createSubTask,
  createTask,
  deleteSubTask,
  deleteTask,
  getTaskById,
  getTasks,
  updateSubTask,
  updateTask,
} from "../controller/task.controllers.js";
import {
  validateProjectPermission,
  verifyJWT,
} from "../middlewares/auth.middleware.js";
import { validate } from "../middlewares/validator.middleware.js";
import {
  createSubTaskValidator,
  createTaskValidator,
  updateSubTaskValidator,
  updateTaskValidator,
} from "../validators/index.js";
import { UserRolesEnum } from "../utils/constant.js";

// Mounted under /api/v1/projects/:projectId/tasks, so :projectId comes
// from the parent router.
const router = Router({ mergeParams: true });

router.use(verifyJWT);

const anyMember = [
  UserRolesEnum.ADMIN,
  UserRolesEnum.PROJECT_ADMIN,
  UserRolesEnum.MEMBER,
];
const managers = [UserRolesEnum.ADMIN, UserRolesEnum.PROJECT_ADMIN];

router
  .route("/")
  .get(validateProjectPermission(anyMember), getTasks)
  .post(
    validateProjectPermission(managers),
    createTaskValidator(),
    validate,
    createTask,
  );

router
  .route("/:taskId")
  .get(validateProjectPermission(anyMember), getTaskById)
  .put(
    validateProjectPermission(managers),
    updateTaskValidator(),
    validate,
    updateTask,
  )
  .delete(validateProjectPermission(managers), deleteTask);

router
  .route("/:taskId/subtasks")
  .post(
    validateProjectPermission(managers),
    createSubTaskValidator(),
    validate,
    createSubTask,
  );

router
  .route("/:taskId/subtasks/:subTaskId")
  // Any member may tick a subtask off, since that is ordinary task work.
  .put(
    validateProjectPermission(anyMember),
    updateSubTaskValidator(),
    validate,
    updateSubTask,
  )
  .delete(validateProjectPermission(managers), deleteSubTask);

export default router;
