/* eslint-disable react/prop-types */
import React from "react";
const TimelinePanel = ({
  steps,
  currentFrame,
  onFrameChange,
  onStepDurationChange,
  onDescriptionChange,
  onAddStep,
  onDuplicateStep,
  onDeleteStep,
  onMoveStep,
}) => {
  return (
    <div className="h-full flex flex-col bg-surface-container-low text-sm">
      {" "}
      <div className="px-4 py-3 flex items-center justify-between bg-surface-container-low">
        {" "}
        <div className="text-xs font-semibold text-on-surface uppercase tracking-wider font-manrope font-semibold">
          Timeline
        </div>{" "}
        <div className="flex items-center gap-2">
          {" "}
          <button
            className="py-1.5 px-3 bg-surface-container hover:bg-surface-container-high rounded-md text-xs text-on-surface transition-colors"
            onClick={onAddStep}
          >
            + Keyframe
          </button>{" "}
          <button
            className="py-1.5 px-3 bg-surface-container hover:bg-surface-container-high rounded-md text-xs text-on-surface transition-colors"
            onClick={onDuplicateStep}
          >
            Duplicate
          </button>{" "}
          <button
            className="py-1.5 px-3 bg-surface-container-high hover:bg-surface-container-highest text-primary text-primary rounded-md text-xs transition-colors"
            onClick={onDeleteStep}
          >
            Delete
          </button>{" "}
          <div className="w-px h-4 bg-surface-container-high mx-1"></div>{" "}
          <button
            className="p-1.5 bg-surface-container hover:bg-surface-container-high rounded-md text-on-surface transition-colors"
            onClick={() =>
              onMoveStep(currentFrame, Math.max(0, currentFrame - 1))
            }
            title="Move Left"
          >
            {" "}
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M15 18l-6-6 6-6" />
            </svg>{" "}
          </button>{" "}
          <button
            className="p-1.5 bg-surface-container hover:bg-surface-container-high rounded-md text-on-surface transition-colors"
            onClick={() =>
              onMoveStep(
                currentFrame,
                Math.min(steps.length - 1, currentFrame + 1),
              )
            }
            title="Move Right"
          >
            {" "}
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M9 18l6-6-6-6" />
            </svg>{" "}
          </button>{" "}
        </div>{" "}
      </div>{" "}
      <div className="flex-1 overflow-x-auto overflow-y-hidden p-4 bg-surface font-inter text-on-surface">
        {" "}
        <div className="min-w-max flex items-center gap-3 h-full">
          {" "}
          {steps.map((step, index) => (
            <div
              key={`${step.id ?? "step"}-${index}`}
              className={`flex flex-col rounded-md transition-all min-w-[160px] cursor-pointer ${index === currentFrame ? "-blue-500 bg-surface-container shadow-ambient -primary " : " bg-surface-container-low hover:"}`}
              onClick={() => onFrameChange(index)}
            >
              {" "}
              <div className="p-3">
                {" "}
                <div className="flex items-center justify-between mb-1">
                  {" "}
                  <div
                    className={`text-xs font-bold ${index === currentFrame ? "text-blue-400" : "text-on-surface"}`}
                  >
                    Frame {index + 1}
                  </div>{" "}
                  <div className="text-[10px] text-outline font-mono">
                    {step.durationMs ?? 600}ms
                  </div>{" "}
                </div>{" "}
                <div
                  className="text-[11px] text-on-surface truncate max-w-[130px]"
                  title={step.description || "No description"}
                >
                  {" "}
                  {step.description || (
                    <span className="italic opacity-50">No description</span>
                  )}{" "}
                </div>{" "}
              </div>{" "}
              <div
                className="px-3 py-2 bg-black/20 rounded-b-lg"
                onClick={(e) => e.stopPropagation()}
              >
                {" "}
                <input
                  className="w-full accent-blue-500 h-1 bg-surface-container-high appearance-none cursor-pointer bg-surface-container-low border-b border-outline-variant/20 focus:outline-none focus:border-b-primary focus:ring-0 py-2 px-0 transition-colors"
                  type="range"
                  min="80"
                  max="2400"
                  step="20"
                  value={step.durationMs ?? 600}
                  onChange={(event) =>
                    onStepDurationChange(index, Number(event.target.value))
                  }
                />{" "}
              </div>{" "}
            </div>
          ))}{" "}
        </div>{" "}
      </div>{" "}
      <div className="p-4 bg-surface-container-low">
        {" "}
        <div className="flex items-center gap-3">
          {" "}
          <div className="text-xs font-semibold text-on-surface whitespace-nowrap">
            Frame Description:
          </div>{" "}
          <input
            value={steps[currentFrame]?.description ?? ""}
            onChange={(event) =>
              onDescriptionChange(currentFrame, event.target.value)
            }
            className="flex-1 bg-white rounded-md text-xs text-on-surface py-2 px-3 focus:outline-none focus:-primary"
            placeholder="Enter a description for this frame..."
          />{" "}
        </div>{" "}
      </div>{" "}
    </div>
  );
};
export default TimelinePanel;
