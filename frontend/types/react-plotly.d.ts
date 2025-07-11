declare module "react-plotly.js" {
	import * as Plotly from "plotly.js";
	import * as React from "react";

	interface PlotParams extends React.HTMLAttributes<HTMLDivElement> {
		data: Plotly.Data[];
		layout: Partial<Plotly.Layout>;
		config?: Partial<Plotly.Config>;
		useResizeHandler?: boolean;
		debug?: boolean;
		onInitialized?: (
			figure: { data: Plotly.Data[]; layout: Partial<Plotly.Layout> },
			graphDiv: HTMLElement
		) => void;
		onUpdate?: (figure: { data: Plotly.Data[]; layout: Partial<Plotly.Layout> }, graphDiv: HTMLElement) => void;
		onPurge?: (figure: { data: Plotly.Data[]; layout: Partial<Plotly.Layout> }, graphDiv: HTMLElement) => void;
		onError?: (err: Error) => void;
		onAfterExport?: () => void;
		onAfterPlot?: () => void;
		onAnimated?: () => void;
		onAnimatingFrame?: (event: Plotly.FrameAnimationEvent) => void;
		onAnimationInterrupted?: () => void;
		onAutoSize?: () => void;
		onBeforeExport?: () => void;
		onButtonClicked?: (event: Plotly.ButtonClickEvent) => void;
		onClick?: (event: Plotly.PlotMouseEvent) => void;
		onClickAnnotation?: (event: Plotly.AnnotationClickEvent) => void;
		onDeselect?: () => void;
		onDoubleClick?: () => void;
		onFramework?: () => void;
		onHover?: (event: Plotly.PlotHoverEvent) => void;
		onLegendClick?: (event: Plotly.LegendClickEvent) => boolean;
		onLegendDoubleClick?: (event: Plotly.LegendClickEvent) => boolean;
		onRelayout?: (event: Plotly.RelayoutEvent) => void;
		onRestyle?: (event: Plotly.PlotRestyleEvent) => void;
		onRedraw?: () => void;
		onSelected?: (event: Plotly.PlotSelectionEvent) => void;
		onSelecting?: (event: Plotly.PlotSelectionEvent) => void;
		onSliderChange?: (event: Plotly.SliderChangeEvent) => void;
		onSliderEnd?: (event: Plotly.SliderEndEvent) => void;
		onSliderStart?: (event: Plotly.SliderStartEvent) => void;
		onSunburstClick?: (event: Plotly.SunburstClickEvent) => void;
		onTransitioning?: () => void;
		onTransitionInterrupted?: () => void;
		onUnhover?: (event: Plotly.PlotHoverEvent) => void;
		onEvent?: (event: any) => void;
	}

	const Plot: React.FunctionComponent<PlotParams>;
	export default Plot;
}
