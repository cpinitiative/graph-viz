const clampUnit = value => Math.max(0, Math.min(1, Number(value) || 0));

export const getOverlayPositionBounds = ({
  canvasSize,
  boxWidth,
  boxHeight,
  margin,
}) => {
  const maxX = Math.max(0, Number(canvasSize?.width) - Number(boxWidth));
  const maxY = Math.max(0, Number(canvasSize?.height) - Number(boxHeight));
  const leftX = Math.min(Number(margin) || 0, maxX);
  const topY = Math.min(Number(margin) || 0, maxY);
  return {
    leftX,
    topY,
    rightX: Math.max(leftX, maxX - (Number(margin) || 0)),
    bottomY: Math.max(topY, maxY - (Number(margin) || 0)),
  };
};

export const getNormalizedOverlayOrigin = ({ bounds, position }) => ({
  x: bounds.leftX + (bounds.rightX - bounds.leftX) * clampUnit(position?.x),
  y: bounds.topY + (bounds.bottomY - bounds.topY) * clampUnit(position?.y),
});

export const getLegendOrigin = ({
  canvasSize,
  boxWidth,
  boxHeight,
  margin,
  position,
  customPosition,
}) => {
  const bounds = getOverlayPositionBounds({
    canvasSize,
    boxWidth,
    boxHeight,
    margin,
  });
  const resolvedPosition = position === 'auto' ? 'bottom-right' : position;

  if (resolvedPosition === 'custom') {
    return getNormalizedOverlayOrigin({
      bounds,
      position: customPosition,
    });
  }

  return {
    x: resolvedPosition.includes('right') ? bounds.rightX : bounds.leftX,
    y: resolvedPosition.includes('bottom') ? bounds.bottomY : bounds.topY,
  };
};
