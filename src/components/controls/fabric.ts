import { type Transform, type TransformActionHandler } from "fabric";
import { resolveOrigin } from "./resolve-origin";

/**
 * Checks if transform is centered
 * @param {Object} transform transform data
 * @return {Boolean} true if transform is centered
 */
export function isTransformCentered(transform: Transform) {
  return (
    resolveOrigin(transform.originX) === resolveOrigin("center") &&
    resolveOrigin(transform.originY) === resolveOrigin("center")
  );
}

/**
 * Wrap an action handler with saving/restoring object position on the transform.
 * this is the code that permits to objects to keep their position while transforming.
 * @param {Function} actionHandler the function to wrap
 * @return {Function} a function with an action handler signature
 */
export function wrapWithFixedAnchor<T extends Transform>(
  actionHandler: TransformActionHandler<T>
) {
  return ((eventData, transform, x, y) => {
    const { target, originX, originY } = transform,
      centerPoint = target.getRelativeCenterPoint(),
      constraint = target.translateToOriginPoint(centerPoint, originX, originY),
      actionPerformed = actionHandler(eventData, transform, x, y);
    // flipping requires to change the transform origin, so we read from the mutated transform
    // instead of leveraging the one destructured before
    target.setPositionByOrigin(
      constraint,
      transform.originX,
      transform.originY
    );
    return actionPerformed;
  }) as TransformActionHandler<T>;
}
