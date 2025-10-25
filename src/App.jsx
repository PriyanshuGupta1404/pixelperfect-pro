import React, { useState, useRef, useEffect } from "react";
import {
  Wand2,
  Github,
  Crop,
  TextCursor,
  UploadCloud,
  Trash2,
  Undo,
  Redo,
  Eraser,
  Check,
  X,
  RotateCcw,
  RotateCw,
  FlipHorizontal,
  FlipVertical,
  Download,
} from "lucide-react";
import { saveAs } from "file-saver";

const ToolButton = ({ icon: Icon, onClick, children, active }) => (
  <button
    onClick={onClick}
    className={`p-2 w-full flex flex-col items-center justify-center gap-1 rounded-lg transition-all duration-200 ${
      active
        ? "bg-indigo-600 text-white shadow-lg"
        : "text-gray-400 hover:bg-gray-700"
    }`}
  >
    <Icon size={20} />
    <span className="text-xs font-medium">{children}</span>
  </button>
);

const Section = ({ title, children, isOpen, onToggle }) => (
  <div className="border-b border-gray-700">
    <button
      onClick={onToggle}
      className="w-full flex justify-between items-center p-3 text-left font-semibold text-gray-200 hover:bg-gray-800"
    >
      <span>{title}</span>
      <svg
        className={`w-5 h-5 transition-transform ${
          isOpen ? "transform rotate-180" : ""
        }`}
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="2"
          d="M19 9l-7 7-7-7"
        ></path>
      </svg>
    </button>
    {isOpen && <div className="p-4 space-y-4 bg-gray-900/50">{children}</div>}
  </div>
);

const Header = () => {
  return (
    <header className="flex items-center justify-between p-3 border-b border-gray-700 bg-gray-800 z-20">
      <div className="flex items-center gap-2">
        <Wand2 className="text-indigo-500" />
        <h1 className="text-xl font-bold">PixelPerfect Pro</h1>
      </div>
      <div className="flex items-center gap-4">
        <a
          href="https://github.com"
          target="_blank"
          rel="noopener noreferrer"
          className="p-2 rounded-full hover:bg-gray-700"
        >
          <Github size={20} />
        </a>
      </div>
    </header>
  );
};

const Toolbar = ({
  activeTool,
  setActiveTool,
  onTextToggle,
  isTextVisible,
}) => {
  return (
    <aside className="w-20 p-2 bg-gray-800 border-r border-gray-700 flex flex-col items-center gap-2">
      <ToolButton
        icon={Wand2}
        onClick={() => setActiveTool("adjust")}
        active={activeTool === "adjust"}
      >
        Adjust
      </ToolButton>
      <ToolButton
        icon={Crop}
        onClick={() => setActiveTool("crop")}
        active={activeTool === "crop"}
      >
        Crop
      </ToolButton>
      <ToolButton
        icon={TextCursor}
        onClick={onTextToggle}
        active={isTextVisible}
      >
        Text
      </ToolButton>
    </aside>
  );
};

const Workspace = ({
  image,
  imageName,
  canvasRef,
  onImageUpload,
  onUndo,
  canUndo,
  onRedo,
  canRedo,
  onReset,
  activeTool,
  crop,
  setCrop,
  textState,
  onTextMove,
  onTextMoveEnd,
}) => {
  const workspaceRef = useRef(null);
  const [isCropping, setIsCropping] = useState(false);
  const [cropStartPoint, setCropStartPoint] = useState({ x: 0, y: 0 });

  const [draggingText, setDraggingText] = useState(false);
  const [textOffset, setTextOffset] = useState({ x: 0, y: 0 });

  const getMousePos = (e) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };

    // Need to scale mouse events to match the canvas resolution, not its display size.
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY,
    };
  };

  const handleMouseDown = (e) => {
    if (activeTool === "crop") {
      setIsCropping(true);
      const pos = getMousePos(e);
      setCropStartPoint(pos);
      setCrop({ x: pos.x, y: pos.y, width: 0, height: 0 });
    } else if (textState.visible) {
      const pos = getMousePos(e);
      const ctx = canvasRef.current.getContext("2d");
      ctx.font = `${textState.size}px ${textState.font}`;
      const textMetrics = ctx.measureText(textState.content);
      const textWidth = textMetrics.width;
      const textHeight = textState.size; // Good enough for hit detection

      // Check if click is inside the text's bounding box
      if (
        pos.x >= textState.x - textWidth / 2 &&
        pos.x <= textState.x + textWidth / 2 &&
        pos.y >= textState.y - textHeight / 2 &&
        pos.y <= textState.y + textHeight / 2
      ) {
        setDraggingText(true);
        setTextOffset({ x: pos.x - textState.x, y: pos.y - textState.y });
      }
    }
  };

  const handleMouseMove = (e) => {
    if (isCropping && activeTool === "crop") {
      const pos = getMousePos(e);
      setCrop({
        x: Math.min(cropStartPoint.x, pos.x),
        y: Math.min(cropStartPoint.y, pos.y),
        width: Math.abs(pos.x - cropStartPoint.x),
        height: Math.abs(pos.y - cropStartPoint.y),
      });
    } else if (draggingText) {
      const pos = getMousePos(e);
      onTextMove({
        x: pos.x - textOffset.x,
        y: pos.y - textOffset.y,
      });
    }
  };

  const handleMouseUp = () => {
    if (isCropping) setIsCropping(false);
    if (draggingText) {
      setDraggingText(false);
      onTextMoveEnd();
    }
  };

  return (
    <main className="flex-1 flex flex-col bg-gray-900 p-4 overflow-auto">
      {!image ? (
        <div
          onDrop={(e) => {
            e.preventDefault();
            onImageUpload(e.dataTransfer.files[0]);
          }}
          onDragOver={(e) => e.preventDefault()}
          className="m-auto flex flex-col items-center justify-center border-2 border-dashed border-gray-600 rounded-2xl w-full h-full text-center p-8"
        >
          <UploadCloud size={64} className="text-gray-500 mb-4" />
          <h2 className="text-2xl font-bold mb-2">Drag & Drop Your Image</h2>
          <p className="text-gray-400">or</p>
          <input
            type="file"
            id="file-upload"
            accept="image/*"
            className="hidden"
            onChange={(e) => onImageUpload(e.target.files[0])}
          />
          <label
            htmlFor="file-upload"
            className="mt-4 bg-indigo-600 text-white font-semibold py-2 px-6 rounded-lg cursor-pointer hover:bg-indigo-700"
          >
            Browse Files
          </label>
        </div>
      ) : (
        <>
          <div className="flex items-center justify-center gap-4 mb-4">
            <div className="flex items-center gap-2">
              <button
                onClick={onUndo}
                disabled={!canUndo}
                className="p-2 rounded-full disabled:opacity-50 hover:bg-gray-700"
              >
                <Undo size={20} />
              </button>
              <button
                onClick={onRedo}
                disabled={!canRedo}
                className="p-2 rounded-full disabled:opacity-50 hover:bg-gray-700"
              >
                <Redo size={20} />
              </button>
            </div>
            <h3 className="font-semibold">{imageName}</h3>
            <button
              onClick={onReset}
              className="p-2 rounded-full hover:bg-red-900/50 text-red-400"
            >
              <Trash2 size={20} />
            </button>
          </div>
          <div ref={workspaceRef} className="relative w-fit h-fit m-auto">
            <canvas
              ref={canvasRef}
              className="max-w-full max-h-full object-contain shadow-2xl rounded-lg"
            />
            <div
              className={`absolute top-0 left-0 w-full h-full ${
                activeTool === "crop" || draggingText
                  ? "cursor-move"
                  : textState.visible
                  ? "cursor-pointer"
                  : ""
              }`}
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseUp}
            >
              {activeTool === "crop" && crop && crop.width > 0 && (
                <div
                  className="absolute border-2 border-dashed border-white bg-black bg-opacity-30"
                  style={{
                    left:
                      crop.x /
                      (canvasRef.current.width / canvasRef.current.clientWidth),
                    top:
                      crop.y /
                      (canvasRef.current.height /
                        canvasRef.current.clientHeight),
                    width:
                      crop.width /
                      (canvasRef.current.width / canvasRef.current.clientWidth),
                    height:
                      crop.height /
                      (canvasRef.current.height /
                        canvasRef.current.clientHeight),
                  }}
                />
              )}
            </div>
          </div>
        </>
      )}
    </main>
  );
};

const CropControls = ({ onApply, onCancel }) => (
  <Section title="Crop Image" isOpen={true} onToggle={() => {}}>
    <div className="flex gap-2">
      <button
        onClick={onApply}
        className="flex-1 flex items-center justify-center gap-2 text-sm p-2 rounded-md bg-green-500 text-white hover:bg-green-600 transition-colors"
      >
        <Check size={16} /> Apply
      </button>
      <button
        onClick={onCancel}
        className="flex-1 flex items-center justify-center gap-2 text-sm p-2 rounded-md bg-gray-600 hover:bg-gray-500 transition-colors"
      >
        <X size={16} /> Cancel
      </button>
    </div>
  </Section>
);

const TransformControls = ({ isOpen, onToggle, state, updateState }) => {
  const baseButtonClasses =
    "flex items-center justify-center gap-2 text-sm p-2 rounded-md bg-gray-700 hover:bg-gray-600 transition-colors";

  return (
    <Section title="Transform" isOpen={isOpen} onToggle={onToggle}>
      <div className="grid grid-cols-2 gap-2">
        <button
          onClick={() => updateState("rotation", state.rotation - 90)}
          className={baseButtonClasses}
        >
          <RotateCcw size={16} /> Rotate Left
        </button>
        <button
          onClick={() => updateState("rotation", state.rotation + 90)}
          className={baseButtonClasses}
        >
          <RotateCw size={16} /> Rotate Right
        </button>
        <button
          onClick={() =>
            updateState("flip", { ...state.flip, h: !state.flip.h })
          }
          className={baseButtonClasses}
        >
          <FlipHorizontal size={16} /> Flip Horiz.
        </button>
        <button
          onClick={() =>
            updateState("flip", { ...state.flip, v: !state.flip.v })
          }
          className={baseButtonClasses}
        >
          <FlipVertical size={16} /> Flip Vert.
        </button>
      </div>
    </Section>
  );
};

const AdjustmentControls = ({
  isOpen,
  onToggle,
  filters,
  onFilterChange,
  onReset,
}) => {
  const baseButtonClasses =
    "flex items-center justify-center gap-2 text-sm p-2 rounded-md bg-gray-700 hover:bg-gray-600 transition-colors";

  return (
    <Section title="Adjustments" isOpen={isOpen} onToggle={onToggle}>
      <button onClick={onReset} className={`${baseButtonClasses} w-full mb-4`}>
        <Eraser size={14} /> Reset Adjustments
      </button>
      {["brightness", "contrast", "saturate", "blur"].map((f) => (
        <div key={f}>
          <label className="capitalize text-sm">{f}</label>
          <input
            type="range"
            min={f === "blur" ? 0 : 0}
            max={f === "blur" ? 20 : 200}
            value={filters[f]}
            onChange={(e) => onFilterChange(f, e.target.value)}
            className="w-full accent-indigo-500"
          />
        </div>
      ))}
    </Section>
  );
};

const FilterControls = ({ isOpen, onToggle, filters, onFilterChange }) => {
  return (
    <Section title="Filters" isOpen={isOpen} onToggle={onToggle}>
      {["grayscale", "sepia", "invert"].map((f) => (
        <div key={f}>
          <label className="capitalize text-sm">{f}</label>
          <input
            type="range"
            min="0"
            max="100"
            value={filters[f]}
            onChange={(e) => onFilterChange(f, e.target.value)}
            className="w-full accent-indigo-500"
          />
        </div>
      ))}
      <div>
        <label className="capitalize text-sm">Hue Rotate</label>
        <input
          type="range"
          min="0"
          max="360"
          value={filters["hueRotate"]}
          onChange={(e) => onFilterChange("hueRotate", e.target.value)}
          className="w-full accent-indigo-500"
        />
      </div>
    </Section>
  );
};

const TextControls = ({ isOpen, onToggle, text, onTextChange }) => {
  const inputClasses =
    "w-full bg-gray-700 border border-gray-600 rounded-md p-2 focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition";
  return (
    <Section title="Text / Watermark" isOpen={isOpen} onToggle={onToggle}>
      <input
        type="text"
        value={text.content}
        onChange={(e) => onTextChange("content", e.target.value)}
        placeholder="Enter text"
        className={inputClasses}
      />
      <div className="grid grid-cols-2 gap-2 mt-2">
        <div>
          <label className="text-sm">Color</label>
          <input
            type="color"
            value={text.color}
            onChange={(e) => onTextChange("color", e.target.value)}
            className="w-full h-10 p-1 bg-gray-700 border border-gray-600 rounded-md cursor-pointer"
          />
        </div>
        <div>
          <label className="text-sm">Size</label>
          <input
            type="number"
            value={text.size}
            onChange={(e) => onTextChange("size", parseInt(e.target.value, 10))}
            className={inputClasses}
          />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2 mt-2">
        <div>
          <label className="text-sm">X Position</label>
          <input
            type="number"
            value={Math.round(text.x)}
            onChange={(e) => onTextChange("x", parseInt(e.target.value, 10))}
            className={inputClasses}
          />
        </div>
        <div>
          <label className="text-sm">Y Position</label>
          <input
            type="number"
            value={Math.round(text.y)}
            onChange={(e) => onTextChange("y", parseInt(e.target.value, 10))}
            className={inputClasses}
          />
        </div>
      </div>
      <p className="text-xs text-gray-400 mt-2">
        You can also drag the text on the canvas to position it.
      </p>
    </Section>
  );
};

const ExportControls = ({
  isOpen,
  onToggle,
  format,
  quality,
  onStateUpdate,
  imageName,
}) => {
  const selectClasses =
    "w-full bg-gray-700 border border-gray-600 rounded-md p-2 focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition";
  const presetButtonClasses =
    "flex-1 text-sm p-2 rounded-md bg-gray-700/50 hover:bg-gray-600 transition-colors";

  const downloadImage = () => {
    const canvas = document.querySelector("canvas");
    if (!canvas) return;
    const baseName =
      imageName.split(".").slice(0, -1).join(".") || "pixelperfect-pro-export";
    canvas.toBlob(
      (blob) => {
        const extension = format.split("/")[1];
        saveAs(blob, `${baseName}.${extension}`);
      },
      format,
      format === "image/jpeg" ? quality : 1.0
    );
  };

  return (
    <Section title="Export" isOpen={isOpen} onToggle={onToggle}>
      <select
        value={format}
        onChange={(e) => onStateUpdate("format", e.target.value, false)}
        className={selectClasses}
      >
        <option value="image/jpeg">JPEG</option>
        <option value="image/png">PNG</option>
        <option value="image/webp">WEBP</option>
      </select>
      {format === "image/jpeg" && (
        <div className="mt-4 space-y-4">
          <div>
            <label className="text-sm font-medium">Compression Presets</label>
            <div className="flex justify-between gap-2 mt-1">
              <button
                onClick={() => onStateUpdate("quality", 0.5, false)}
                className={presetButtonClasses}
              >
                Low
              </button>
              <button
                onClick={() => onStateUpdate("quality", 0.75, false)}
                className={presetButtonClasses}
              >
                Medium
              </button>
              <button
                onClick={() => onStateUpdate("quality", 0.9, false)}
                className={presetButtonClasses}
              >
                High
              </button>
            </div>
          </div>
          <div>
            <label className="text-sm font-medium">Quality: {quality}</label>
            <input
              type="range"
              min="0.1"
              max="1"
              step="0.05"
              value={quality}
              onChange={(e) =>
                onStateUpdate("quality", parseFloat(e.target.value), false)
              }
              className="w-full accent-indigo-500"
            />
          </div>
        </div>
      )}
      <button
        onClick={downloadImage}
        className="w-full bg-indigo-600 text-white font-bold py-3 rounded-lg hover:bg-indigo-700 transition-all mt-4"
      >
        <Download className="inline-block mr-2" /> Download Image
      </button>
    </Section>
  );
};

const ControlPanel = ({
  image,
  state,
  updateState,
  activeTool,
  imageName,
  applyCrop,
  cancelCrop,
}) => {
  const [openSections, setOpenSections] = useState({
    transform: true,
    adjustments: true,
    filters: false,
    text: false,
    export: true,
  });
  const toggleSection = (section) =>
    setOpenSections((prev) => ({ ...prev, [section]: !prev[section] }));
  const handleFilterChange = (filter, value) =>
    updateState("filters", { ...state.filters, [filter]: value });
  const handleTextChange = (prop, value) =>
    updateState("text", { ...state.text, [prop]: value });

  return (
    <aside
      className={`w-80 bg-gray-800 border-r border-gray-700 flex flex-col transition-all duration-300 ${
        !image ? "opacity-50 pointer-events-none" : ""
      }`}
    >
      <div className="flex-1 overflow-y-auto">
        {activeTool === "crop" && (
          <CropControls onApply={applyCrop} onCancel={cancelCrop} />
        )}
        {activeTool === "adjust" && (
          <>
            <TransformControls
              isOpen={openSections.transform}
              onToggle={() => toggleSection("transform")}
              state={state}
              updateState={updateState}
            />
            <AdjustmentControls
              isOpen={openSections.adjustments}
              onToggle={() => toggleSection("adjustments")}
              filters={state.filters}
              onFilterChange={handleFilterChange}
              onReset={() =>
                updateState("filters", {
                  brightness: 100,
                  contrast: 100,
                  saturate: 100,
                  grayscale: 0,
                  sepia: 0,
                  invert: 0,
                  hueRotate: 0,
                  blur: 0,
                })
              }
            />
            <FilterControls
              isOpen={openSections.filters}
              onToggle={() => toggleSection("filters")}
              filters={state.filters}
              onFilterChange={handleFilterChange}
            />
          </>
        )}
        {state.text.visible && (
          <TextControls
            isOpen={openSections.text}
            onToggle={() => toggleSection("text")}
            text={state.text}
            onTextChange={handleTextChange}
          />
        )}
        <ExportControls
          isOpen={openSections.export}
          onToggle={() => toggleSection("export")}
          format={state.format}
          quality={state.quality}
          onStateUpdate={updateState}
          imageName={imageName}
        />
      </div>
    </aside>
  );
};

const App = () => {
  // Core state
  const [image, setImage] = useState(null);
  const [imageName, setImageName] = useState("");
  const [activeTool, setActiveTool] = useState("adjust");

  // History state
  const [history, setHistory] = useState([]);
  const [historyIndex, setHistoryIndex] = useState(-1);

  // Editing state
  const [crop, setCrop] = useState(null);
  const [state, setState] = useState({
    quality: 0.9,
    format: "image/jpeg",
    rotation: 0,
    flip: { h: false, v: false },
    filters: {
      brightness: 100,
      contrast: 100,
      saturate: 100,
      grayscale: 0,
      sepia: 0,
      invert: 0,
      hueRotate: 0,
      blur: 0,
    },
    text: {
      content: "Hello World",
      x: 50,
      y: 50,
      color: "#ffffff",
      size: 40,
      font: "Arial",
      visible: false,
    },
  });

  const canvasRef = useRef(null);

  useEffect(() => {
    document.documentElement.classList.add("dark");
  }, []);

  const addToHistory = (newImage, newState) => {
    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push({ image: newImage, state: newState });
    setHistory(newHistory);
    setHistoryIndex(newHistory.length - 1);
  };

  const updateState = (key, value, record = true) => {
    setState((prevState) => {
      const newState = { ...prevState, [key]: value };
      if (record) addToHistory(image, newState);
      return newState;
    });
  };

  const undo = () => {
    if (historyIndex > 0) {
      const prevHistoryIndex = historyIndex - 1;
      const { image: prevImage, state: prevState } = history[prevHistoryIndex];
      setImage(prevImage);
      setState(prevState);
      setHistoryIndex(prevHistoryIndex);
    }
  };

  const redo = () => {
    if (historyIndex < history.length - 1) {
      const nextHistoryIndex = historyIndex + 1;
      const { image: nextImage, state: nextState } = history[nextHistoryIndex];
      setImage(nextImage);
      setState(nextState);
      setHistoryIndex(nextHistoryIndex);
    }
  };

  const redrawCanvas = () => {
    if (!image || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    const img = new Image();

    img.onload = () => {
      // This logic is from the old `applyTransformations`
      const rad = (state.rotation * Math.PI) / 180;
      const cos = Math.abs(Math.cos(rad));
      const sin = Math.abs(Math.sin(rad));

      const newWidth = img.naturalWidth * cos + img.naturalHeight * sin;
      const newHeight = img.naturalWidth * sin + img.naturalHeight * cos;

      if (canvas.width !== newWidth) canvas.width = newWidth;
      if (canvas.height !== newHeight) canvas.height = newHeight;

      ctx.save();
      ctx.translate(canvas.width / 2, canvas.height / 2);
      ctx.rotate(rad);
      ctx.scale(state.flip.h ? -1 : 1, state.flip.v ? -1 : 1);

      const filterString = `brightness(${state.filters.brightness}%) contrast(${state.filters.contrast}%) saturate(${state.filters.saturate}%) grayscale(${state.filters.grayscale}%) sepia(${state.filters.sepia}%) invert(${state.filters.invert}%) hue-rotate(${state.filters.hueRotate}deg) blur(${state.filters.blur}px)`;

      if (ctx.filter !== filterString) {
        ctx.filter = filterString;
      }

      ctx.drawImage(img, -img.naturalWidth / 2, -img.naturalHeight / 2);
      ctx.restore();

      if (state.text.visible) {
        ctx.fillStyle = state.text.color;
        ctx.font = `${state.text.size}px ${state.text.font}`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(state.text.content, state.text.x, state.text.y);
      }
    };

    img.onerror = () => {
      console.error("Failed to load image for canvas");
    };
    img.crossOrigin = "Anonymous";
    img.src = image;
  };

  useEffect(() => {
    // This is a simpler implementation without debouncing.
    // It will be less performant but is easier to understand.
    if (image) {
      redrawCanvas();
    }
  }, [image, state]); // Redraw when image or state changes

  const loadImage = (file) => {
    if (!file || !file.type.startsWith("image/")) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      const newImage = e.target.result;
      const img = new Image();
      img.onload = () => {
        setImage(newImage);
        setImageName(file.name);
        const initialState = {
          quality: 0.9,
          format: "image/jpeg",
          rotation: 0,
          flip: { h: false, v: false },
          filters: {
            brightness: 100,
            contrast: 100,
            saturate: 100,
            grayscale: 0,
            sepia: 0,
            invert: 0,
            hueRotate: 0,
            blur: 0,
          },
          text: {
            ...state.text,
            visible: false,
            x: img.naturalWidth / 2,
            y: img.naturalHeight / 2,
          },
        };
        setState(initialState);
        setHistory([{ image: newImage, state: initialState }]);
        setHistoryIndex(0);
      };
      img.src = newImage;
    };
    reader.readAsDataURL(file);
  };

  const toggleText = () =>
    updateState("text", { ...state.text, visible: !state.text.visible });
  const clearImage = () => {
    setImage(null);
    setImageName("");
    setHistory([]);
    setHistoryIndex(-1);
  };

  const updateTextPosition = (newPos) => {
    setState((prevState) => ({
      ...prevState,
      text: { ...prevState.text, x: newPos.x, y: newPos.y },
    }));
  };

  const finalizeTextMove = () => {
    addToHistory(image, state);
  };

  const confirmCrop = () => {
    if (!crop || !canvasRef.current) return;
    const canvas = canvasRef.current;

    // Use crop values directly as they are already in canvas coords
    const cropX = crop.x;
    const cropY = crop.y;
    const cropWidth = crop.width;
    const cropHeight = crop.height;

    if (cropWidth <= 0 || cropHeight <= 0) {
      resetCrop();
      return;
    }

    const cropCanvas = document.createElement("canvas");
    cropCanvas.width = cropWidth;
    cropCanvas.height = cropHeight;
    const cropCtx = cropCanvas.getContext("2d");
    // Draw the cropped area from the DISPLAYED canvas, which includes all transformations
    cropCtx.drawImage(
      canvas,
      cropX,
      cropY,
      cropWidth,
      cropHeight,
      0,
      0,
      cropWidth,
      cropHeight
    );

    const newImage = cropCanvas.toDataURL(state.format);
    const img = new Image();
    img.onload = () => {
      const newState = {
        ...state,
        rotation: 0,
        flip: { h: false, v: false },
        text: {
          ...state.text,
          x: img.naturalWidth / 2,
          y: img.naturalHeight / 2,
        },
      };
      setImage(newImage);
      setState(newState);
      addToHistory(newImage, newState);
      resetCrop();
    };
    img.src = newImage;
  };

  const resetCrop = () => {
    setCrop(null);
    setActiveTool("adjust");
  };

  return (
    <div className="dark flex flex-col h-screen font-sans bg-gray-900 text-gray-200">
      <Header />
      <div className="flex flex-1 overflow-hidden">
        <Toolbar
          activeTool={activeTool}
          setActiveTool={setActiveTool}
          onTextToggle={toggleText}
          isTextVisible={state.text.visible}
        />
        <ControlPanel
          image={image}
          state={state}
          updateState={updateState}
          activeTool={activeTool}
          imageName={imageName}
          applyCrop={confirmCrop}
          cancelCrop={resetCrop}
        />
        <Workspace
          image={image}
          imageName={imageName}
          canvasRef={canvasRef}
          onImageUpload={loadImage}
          onUndo={undo}
          canUndo={historyIndex > 0}
          onRedo={redo}
          canRedo={historyIndex < history.length - 1}
          onReset={clearImage}
          activeTool={activeTool}
          crop={crop}
          setCrop={setCrop}
          textState={state.text}
          onTextMove={updateTextPosition}
          onTextMoveEnd={finalizeTextMove}
        />
      </div>
    </div>
  );
};

export default App;
