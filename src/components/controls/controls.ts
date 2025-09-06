import { Control, controlsUtils } from "fabric";
import { drawVerticalLeftIcon, drawVerticalRightIcon } from "./draw";
import { changeWidth } from "./change-width";

const { scaleSkewCursorStyleHandler } = controlsUtils;

export const createMediaControls = () => ({
  mr: new Control({
    x: 0.5,
    y: 0,
    render: drawVerticalRightIcon,
    actionHandler: changeWidth,
    cursorStyleHandler: scaleSkewCursorStyleHandler,
    actionName: "resizing",
    // @ts-ignore
    controlOrientation: "right"
  }),
  ml: new Control({
    x: -0.5,
    y: 0,
    render: drawVerticalLeftIcon,
    actionHandler: changeWidth,
    cursorStyleHandler: scaleSkewCursorStyleHandler,
    actionName: "resizing",
    // @ts-ignore
    controlOrientation: "left"
  })
});
