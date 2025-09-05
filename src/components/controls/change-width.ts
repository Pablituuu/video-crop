import { controlsUtils, type TransformActionHandler } from 'fabric';
import { resolveOrigin } from './resolve-origin';
import { isTransformCentered } from './fabric';
import { wrapWithFixedAnchor } from './fabric';
import type { VideoCropRect } from '../video-crop-rect';
import type { CanvasVideoCrop } from '../canvas-video-crop';

const { wrapWithFireEvent, getLocalPoint } = controlsUtils;

/**
 * Action handler to change object's width
 * Needs to be wrapped with `wrapWithFixedAnchor` to be effective
 * @param {Event} eventData javascript event that is doing the transform
 * @param {Object} transform javascript object containing a series of information around the current transform
 * @param {number} x current mouse x position, canvas normalized
 * @param {number} y current mouse y position, canvas normalized
 * @return {Boolean} true if some change happened
 */
export const changeObjectWidth: TransformActionHandler = (
  _,
  transform,
  x,
  y,
) => {
  const localPoint = getLocalPoint(
    transform,
    transform.originX,
    transform.originY,
    x,
    y,
  );
  //  make sure the control changes width ONLY from it's side of target
  if (
    resolveOrigin(transform.originX) === resolveOrigin("center") ||
    (resolveOrigin(transform.originX) === resolveOrigin("right") &&
      localPoint.x < 0) ||
    (resolveOrigin(transform.originX) === resolveOrigin("left") &&
      localPoint.x > 0)
  ) {
    const { target } = transform,
      strokePadding =
        target.strokeWidth / (target.strokeUniform ? target.scaleX : 1),
      multiplier = isTransformCentered(transform) ? 2 : 1,
      oldWidth = target.width,
      newWidth =
        Math.abs((localPoint.x * multiplier) / target.scaleX) - strokePadding;
    const cropObject = target as VideoCropRect
    const canvas = target.canvas as CanvasVideoCrop
    const maxWidth = cropObject.maxWidth || cropObject.initialWidth
    if (transform.corner === "ml") {
      canvas.playerRef?.seekTo(0)
    }
    const diffPos = oldWidth - newWidth;
    const nextLeft = target.left + (transform.corner === "mr" ? 0 : diffPos);

    if (nextLeft < 0 && newWidth < maxWidth) {
      target.set("left", 0)
      target.set("width", oldWidth)
      if (target.left !== 0) {
        canvas.setCropTimeMs(0)
      }
      return false
    } else if (nextLeft < 0 && newWidth >= maxWidth) {
      target.set("left", 0)
      target.set("width", maxWidth)
      if (target.left !== 0) {
        canvas.setCropTimeMs(0)
      }
      return false
    }
    if (transform.corner === "mr") {
      if (newWidth > maxWidth) {
        target.set("width", maxWidth)
        return false
      }
    } else if (transform.corner === "ml") {
      if (newWidth > maxWidth) {
        const diffWidth = maxWidth - oldWidth
        target.set("width", maxWidth)
        target.set("left", target.left + diffWidth)
        return false
      }
    }
    target.set('width', Math.max(newWidth, 1));
    const factorWidth = cropObject.initialWidth / nextLeft
    canvas.setCropTimeMs(canvas.totalDurationMs / factorWidth)
    return oldWidth !== target.width;
  }
  return false;
};

export const changeWidth = wrapWithFireEvent(
  "resizing",
  wrapWithFixedAnchor(changeObjectWidth),
);
