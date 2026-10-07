import multer from "multer";
import { ApiError } from "../utils/api-error.js";

export const MAX_UPLOAD_BYTES = 5 * 1024 * 1024;

/**
 * Keeps the file in memory because it goes straight into Mongo — the host's
 * filesystem is ephemeral, so anything written to disk disappears on the next
 * deploy.
 */
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: MAX_UPLOAD_BYTES,
    files: 1,
  },
});

/**
 * Wraps multer so its own errors come back in the API's JSON shape with a
 * useful status, instead of multer's default 500.
 */
export const uploadSingle = (field) => (req, res, next) =>
  upload.single(field)(req, res, (err) => {
    if (!err) return next();

    if (err instanceof multer.MulterError) {
      if (err.code === "LIMIT_FILE_SIZE") {
        return next(
          new ApiError(
            413,
            `File is too large. The limit is ${MAX_UPLOAD_BYTES / (1024 * 1024)}MB.`,
          ),
        );
      }
      return next(new ApiError(400, err.message));
    }
    return next(err);
  });
