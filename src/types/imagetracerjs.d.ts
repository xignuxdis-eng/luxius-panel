declare module 'imagetracerjs' {
    export interface ImageTracerOptions {
        corsenabled?: boolean;
        ltres?: number;
        qtres?: number;
        pathomit?: number;
        rightangleenhance?: boolean;
        colorsampling?: number;
        numberofcolors?: number;
        mincolorratio?: number;
        colorquantcycles?: number;
        layering?: number;
        layerpalette?: any;
        pal?: Array<{ r: number; g: number; b: number; a: number }>;
        linefilter?: boolean;
        scale?: number;
        roundcoords?: number;
        viewbox?: boolean;
        desc?: boolean;
        lcpradius?: number;
        qcpradius?: number;
        blurradius?: number;
        blurdelta?: number;
    }

    export interface ImageTracerInstance {
        versionnumber: string;
        imageToSVG(
            url: string,
            callback: (svgStr: string) => void,
            options?: ImageTracerOptions | string
        ): void;
        imagedataToSVG(
            imgData: ImageData | { width: number; height: number; data: Uint8ClampedArray },
            options?: ImageTracerOptions | string
        ): string;
        optionpresets: Record<string, ImageTracerOptions>;
    }

    const ImageTracer: ImageTracerInstance;
    export default ImageTracer;
}
