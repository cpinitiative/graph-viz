/* eslint-disable react/prop-types */

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
    <div className="h-full flex flex-col bg-surface-container-low text-sm dark:bg-dark-surface-container-low">
      {" "}
      <div className="px-3 py-2 flex items-center justify-between bg-surface-container-low dark:bg-dark-surface-container-low flex-wrap gap-2">
        {" "}
        <div className="text-xs text-on-surface uppercase tracking-wider font-manrope font-semibold dark:text-dark-on-surface">
          Timeline
        </div>{" "}
        <div className="flex items-center gap-2 flex-wrap">
          {" "}
          <button
            className="py-1.5 px-2.5 bg-surface-container hover:bg-surface-container-high rounded-md text-xs text-on-surface transition-colors dark:bg-dark-surface-container dark:hover:bg-dark-surface-container-high dark:text-dark-on-surface min-h-[32px] md:min-h-0"
            onClick={onAddStep}
          >
            + Keyframe
          </button>{" "}
          <button
            className="py-1.5 px-2.5 bg-surface-container hover:bg-surface-container-high rounded-md text-xs text-on-surface transition-colors dark:bg-dark-surface-container dark:hover:bg-dark-surface-container-high dark:text-dark-on-surface min-h-[32px] md:min-h-0"
            onClick={onDuplicateStep}
          >
            Duplicate
          </button>{" "}
          <button
            className="py-1.5 px-2.5 bg-surface-container-high hover:bg-surface-container-highest text-primary rounded-md text-xs transition-colors dark:bg-dark-surface-container-high dark:hover:bg-dark-surface-container-highest dark:text-dark-primary min-h-[32px] md:min-h-0"
            onClick={onDeleteStep}
          >
            Delete
          </button>{" "}
          <div className="w-px h-4 bg-surface-container-high mx-1 dark:bg-dark-surface-container-high"></div>{" "}
          <button
            className="p-1.5 bg-surface-container hover:bg-surface-container-high rounded-md text-on-surface transition-colors dark:bg-dark-surface-container dark:hover:bg-dark-surface-container-high dark:text-dark-on-surface min-w-[32px] md:min-w-0"
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
            className="p-1.5 bg-surface-container hover:bg-surface-container-high rounded-md text-on-surface transition-colors dark:bg-dark-surface-container dark:hover:bg-dark-surface-container-high dark:text-dark-on-surface min-w-[32px] md:min-w-0"
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
      <div className="flex-1 overflow-x-auto overflow-y-hidden p-2 bg-surface font-inter text-on-surface dark:bg-dark-surface dark:text-dark-on-surface">
        {" "}
        <div className="min-w-max flex items-center gap-2 h-full">
          {" "}
          {steps.map((step, index) => (
            <div
              key={`${step.id ?? "step"}-${index}`}
              className={`flex flex-col rounded-md transition-all min-w-[112px] md:min-w-[128px] cursor-pointer ${index === currentFrame ? "bg-surface-container dark:bg-dark-surface-container shadow-ambient border-2 border-blue-500" : "bg-surface-container-low dark:bg-dark-surface-container-low hover:bg-surface-container-high dark:hover:bg-dark-surface-container-high"}`}
              onClick={() => onFrameChange(index)}
            >
              {" "}
              <div className="p-2">
                {" "}
                <div className="flex items-center justify-between mb-1">
                  {" "}
                  <div
                    className={`text-xs font-bold ${index === currentFrame ? "text-blue-400" : "text-on-surface dark:text-dark-on-surface"}`}
                  >
                    Frame {index + 1}
                  </div>{" "}
                  <div className="text-[10px] text-outline font-mono dark:text-dark-outline">
                    {step.durationMs ?? 600}ms
                  </div>{" "}
                </div>{" "}
                <div
                  className="text-[10px] text-on-surface truncate max-w-[92px] md:max-w-[108px] dark:text-dark-on-surface"
                  title={step.description || "No description"}
                >
                  {" "}
                  {step.description || (
                    <span className="italic opacity-50">No description</span>
                  )}{" "}
                </div>{" "}
              </div>{" "}
              <div
                className="px-2 py-1.5 bg-black/20 rounded-b-lg dark:bg-white/10"
                onClick={(e) => e.stopPropagation()}
              >
                {" "}
                <input
                  className="w-full accent-blue-500 h-1.5 bg-surface-container-high appearance-none cursor-pointer border-b border-outline-variant/20 dark:border-dark-outline-variant/20 focus:outline-none focus:border-b-primary focus:ring-0 py-1 px-0 transition-colors"
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
      <div className="p-3 bg-surface-container-low dark:bg-dark-surface-container-low">
        {" "}
        <div className="flex items-center gap-3">
          {" "}
          <div className="text-xs font-semibold text-on-surface whitespace-nowrap dark:text-dark-on-surface">
            Frame Description:
          </div>{" "}
          <input
            value={steps[currentFrame]?.description ?? ""}
            onChange={(event) =>
              onDescriptionChange(currentFrame, event.target.value)
            }
            className="flex-1 bg-white rounded-md text-xs text-on-surface py-1.5 px-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:text-dark-on-surface"
            placeholder="Enter a description for this frame..."
          />{" "}
        </div>{" "}
      </div>{" "}
    </div>
  );
};
export default TimelinePanel;
