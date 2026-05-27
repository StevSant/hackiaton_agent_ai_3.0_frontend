import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  OnDestroy,
  signal,
  viewChild,
} from '@angular/core';
import * as L from 'leaflet';

import { Icon } from '../../../shared/ui/icon';
import { ECUADOR_FRAUD_HOTSPOTS } from '../services/ecuador-hotspots.data';
import {
  ECUADOR_MAP_FIT_PADDING,
  ecuadorPanBounds,
  ecuadorViewportBounds,
} from '../utils/ecuador-map-bounds';
import { buildHotspotMarkerHtml, buildHotspotPopupHtml } from '../utils/map-hotspot-marker';

const TOPO_TILE_URL = 'https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png';
const TOPO_ATTRIBUTION =
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors, SRTM | Map style: &copy; OpenTopoMap';

@Component({
  selector: 'insights-ecuador-map',
  standalone: true,
  imports: [Icon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div
      class="bg-surface border border-line rounded-lg relative insights-map-container overflow-hidden w-full h-full"
    >
      <div #mapHost class="insights-leaflet-host absolute inset-0 z-0"></div>

      <div class="absolute top-2.5 left-2.5 z-[1000] flex flex-col items-start gap-1.5 max-w-[min(100%,220px)]">
        <button
          type="button"
          class="insights-glass-card inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border border-line shadow-sm text-left hover:bg-surface transition-colors"
          (click)="toggleHint()"
          [attr.aria-expanded]="hintOpen()"
          aria-controls="insights-map-hint"
        >
          <span class="w-1.5 h-1.5 rounded-full bg-[#8b5cf6] animate-pulse shrink-0"></span>
          <span class="text-[10.5px] font-mono font-medium text-[#8b5cf6] uppercase tracking-wide">
            Hotspots IA
          </span>
          <span class="text-ink-4 ml-0.5">
            <ui-icon [name]="hintOpen() ? 'expand_less' : 'info'" [size]="14" />
          </span>
        </button>

        @if (hintOpen()) {
          <div
            id="insights-map-hint"
            class="insights-glass-card px-2.5 py-2 rounded-md border border-line shadow-sm pointer-events-none"
          >
            <p class="text-[11px] font-semibold text-ink m-0 leading-tight">Intensidad regional</p>
            <p class="text-[10.5px] text-ink-3 m-0 mt-0.5 leading-snug">
              Haz clic en Quito o Guayaquil para ver telemetría detallada.
            </p>
          </div>
        }
      </div>

      <div class="absolute bottom-2 left-2 right-2 flex justify-between items-end z-[1000] pointer-events-none">
        <div class="flex gap-1.5 pointer-events-auto">
          <div class="insights-glass-card px-2 py-0.5 rounded-full border border-line flex items-center gap-1.5">
            <span class="w-1.5 h-1.5 rounded-full bg-tier-red"></span>
            <span class="text-[10px] font-mono text-ink-2">Alto</span>
          </div>
          <div class="insights-glass-card px-2 py-0.5 rounded-full border border-line flex items-center gap-1.5">
            <span class="w-1.5 h-1.5 rounded-full bg-tier-yellow"></span>
            <span class="text-[10px] font-mono text-ink-2">Medio</span>
          </div>
        </div>
        <div
          class="insights-glass-card px-1.5 py-1 border border-line rounded-md flex gap-2 pointer-events-auto"
        >
          <button
            type="button"
            class="w-7 h-7 grid place-items-center text-ink-3 hover:text-ink bg-transparent border-0 p-0 cursor-pointer rounded-sm hover:bg-hover"
            (click)="zoomIn()"
            aria-label="Acercar mapa"
          >
            <ui-icon name="add" [size]="16" />
          </button>
          <button
            type="button"
            class="w-7 h-7 grid place-items-center text-ink-3 hover:text-ink bg-transparent border-0 p-0 cursor-pointer rounded-sm hover:bg-hover"
            (click)="zoomOut()"
            aria-label="Alejar mapa"
          >
            <ui-icon name="remove" [size]="16" />
          </button>
          <button
            type="button"
            class="w-7 h-7 grid place-items-center text-ink-3 hover:text-ink bg-transparent border-0 p-0 cursor-pointer rounded-sm hover:bg-hover"
            (click)="resetView()"
            aria-label="Restablecer vista de Ecuador"
          >
            <ui-icon name="layers" [size]="16" />
          </button>
        </div>
      </div>
    </div>
  `,
})
export class EcuadorHotspotsMap implements AfterViewInit, OnDestroy {
  private readonly mapHost = viewChild.required<ElementRef<HTMLElement>>('mapHost');

  private map: L.Map | null = null;
  private readonly markers: L.Marker[] = [];
  private resizeObserver: ResizeObserver | null = null;

  protected readonly hintOpen = signal(false);

  ngAfterViewInit(): void {
    this.initMap();
    this.observeMapResize();
  }

  ngOnDestroy(): void {
    this.resizeObserver?.disconnect();
    this.resizeObserver = null;
    this.map?.remove();
    this.map = null;
    this.markers.length = 0;
  }

  protected toggleHint(): void {
    this.hintOpen.update((open) => !open);
    setTimeout(() => this.map?.invalidateSize(), 0);
  }

  protected zoomIn(): void {
    this.map?.zoomIn();
  }

  protected zoomOut(): void {
    this.map?.zoomOut();
  }

  protected resetView(): void {
    this.fitEcuadorViewport();
  }

  private initMap(): void {
    const host = this.mapHost().nativeElement;
    const panBounds = ecuadorPanBounds();

    // Start at Ecuador's geographic center at a neutral zoom;
    // fitEcuadorViewport() will immediately correct to the right zoom.
    this.map = L.map(host, {
      center: [-1.65, -78.3],
      zoom: 8,
      minZoom: 7,
      maxZoom: 11,
      maxBounds: panBounds,
      maxBoundsViscosity: 0.8,
      zoomControl: false,
      attributionControl: true,
      worldCopyJump: false,
    });

    L.tileLayer(TOPO_TILE_URL, {
      attribution: TOPO_ATTRIBUTION,
      opacity: 0.58,
      bounds: panBounds,
    }).addTo(this.map);

    for (const hotspot of ECUADOR_FRAUD_HOTSPOTS) {
      this.addHotspotMarker(hotspot);
    }

    // Wait for the container to have real dimensions before fitting
    requestAnimationFrame(() => {
      this.map?.invalidateSize({ animate: false });
      this.fitEcuadorViewport();
    });
  }

  private observeMapResize(): void {
    const host = this.mapHost().nativeElement;
    let resizeTimer: ReturnType<typeof setTimeout> | null = null;

    this.resizeObserver = new ResizeObserver(() => {
      if (!this.map) return;
      this.map.invalidateSize({ animate: false });
      // Debounce: only refit after resize settles
      if (resizeTimer) clearTimeout(resizeTimer);
      resizeTimer = setTimeout(() => this.fitEcuadorViewport(), 120);
    });

    this.resizeObserver.observe(host);
  }

  private fitEcuadorViewport(): void {
    if (!this.map) return;

    const viewBounds = ecuadorViewportBounds();
    const { topLeft, bottomRight } = ECUADOR_MAP_FIT_PADDING;

    this.map.fitBounds(viewBounds, {
      paddingTopLeft: topLeft,
      paddingBottomRight: bottomRight,
      maxZoom: 9,
      animate: false,
    });

    this.map.setMinZoom(this.map.getZoom());
  }

  private addHotspotMarker(hotspot: (typeof ECUADOR_FRAUD_HOTSPOTS)[number]): void {
    if (!this.map) return;

    const iconSize = hotspot.risk === 'high' ? 52 : 40;
    const icon = L.divIcon({
      className: 'insights-hotspot-leaflet-icon',
      html: buildHotspotMarkerHtml(hotspot),
      iconSize: [iconSize, iconSize],
      iconAnchor: [iconSize / 2, iconSize / 2],
    });

    const marker = L.marker([hotspot.latitude, hotspot.longitude], { icon }).addTo(this.map);

    marker.bindPopup(buildHotspotPopupHtml(hotspot), {
      className: 'insights-hotspot-leaflet-popup',
      closeButton: false,
      offset: [0, -8],
    });

    marker.on('mouseover', () => marker.openPopup());
    marker.on('mouseout', () => marker.closePopup());
    marker.on('click', () => marker.openPopup());

    this.markers.push(marker);
  }
}
