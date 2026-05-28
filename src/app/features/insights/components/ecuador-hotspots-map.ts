import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  OnDestroy,
  computed,
  effect,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { Router } from '@angular/router';
import * as L from 'leaflet';

import { ClaimsStore } from '@core/state/claims.store';
import { Icon } from '@shared/ui/icon';
import { formatMoneyShort, insightsClaimReturnQuery, ramoLabel, type RiskTier } from '@shared/utils';
import { InsightsStore, type IncidentPoint } from '../services/insights.store';
import type { MapHotspot } from '../models';
import {
  ECUADOR_MAP_FIT_PADDING,
  ecuadorPanBounds,
  ecuadorViewportBounds,
} from '../utils/ecuador-map-bounds';
import { buildHotspotMarkerHtml, buildHotspotPopupHtml } from '../utils/map-hotspot-marker';

const TOPO_TILE_URL = 'https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png';
const TOPO_ATTRIBUTION =
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors, SRTM | Map style: &copy; OpenTopoMap';
/** Below this zoom only city hotspots are shown; at/above it, individual cases appear. */
const INCIDENT_DETAIL_MIN_ZOOM = 9;

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

      <div class="absolute top-2.5 left-2.5 z-[1000] flex flex-col items-start gap-1.5 max-w-[min(100%,240px)]">
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
              {{ store.hotspots().length }} ciudades con actividad. Acerca el mapa para ver cada caso.
            </p>
            <p class="text-[10px] text-ink-4 m-0 mt-1.5 leading-snug border-t border-line pt-1.5">
              Ubicación aproximada — no es el punto exacto del siniestro.
            </p>
          </div>
        }

        @if (selectedSummary(); as summary) {
          <div
            class="insights-glass-card px-2.5 py-2.5 rounded-md border border-line shadow-sm pointer-events-auto w-[min(100%,240px)]"
            role="dialog"
            aria-label="Resumen del siniestro"
          >
            <div class="flex items-start justify-between gap-2 mb-1.5">
              <span class="font-mono text-[10px] text-brand-ink truncate">{{ summary.id }}</span>
              <button
                type="button"
                class="border-0 bg-transparent p-0 cursor-pointer text-ink-3 hover:text-ink shrink-0 grid place-items-center"
                (click)="clearSelection()"
                aria-label="Cerrar resumen"
              >
                <ui-icon name="close" [size]="14" />
              </button>
            </div>
            <div class="flex flex-wrap items-center gap-1.5 mb-1.5">
              <span class="text-[10px] font-medium px-1.5 py-px rounded-full bg-soft text-ink-2">
                {{ summary.ramoLabel }}
              </span>
              <span class="text-[9px] font-mono px-1.5 py-px rounded-full" [class]="summary.tierClass">
                {{ summary.tierLabel }}
              </span>
              <span class="text-[10px] font-mono text-ink-3 tabular-nums">Score {{ summary.score }}</span>
            </div>
            <dl class="grid grid-cols-[auto_1fr] gap-x-2 gap-y-0.5 text-[10px] m-0">
              <dt class="text-ink-3">Sucursal</dt>
              <dd class="text-ink m-0 truncate">{{ summary.sucursal }}</dd>
              @if (summary.monto) {
                <dt class="text-ink-3">Monto</dt>
                <dd class="text-ink m-0 tabular-nums">{{ summary.monto }}</dd>
              }
              @if (summary.fecha) {
                <dt class="text-ink-3">Ocurrencia</dt>
                <dd class="text-ink m-0">{{ summary.fecha }}</dd>
              }
              @if (summary.asegurado) {
                <dt class="text-ink-3">Asegurado</dt>
                <dd class="text-ink m-0 truncate">{{ summary.asegurado }}</dd>
              }
            </dl>
            @if (summary.descripcion) {
              <p class="text-[10px] text-ink-3 m-0 mt-1.5 leading-snug line-clamp-2">{{ summary.descripcion }}</p>
            }
            <button
              type="button"
              class="mt-2 inline-flex items-center gap-1 text-[10px] font-medium text-brand-ink hover:underline bg-transparent border-0 p-0 cursor-pointer"
              (click)="openCase(summary.id)"
            >
              Ver detalle del caso
              <ui-icon name="arrow_forward" [size]="12" />
            </button>
          </div>
        }
      </div>

      <div
        class="absolute top-2.5 right-2.5 z-[1000] max-w-[min(100%,200px)] pointer-events-none"
        aria-hidden="true"
      >
        <div class="insights-glass-card px-2 py-1 rounded-md border border-line shadow-sm">
          <p class="text-[9.5px] text-ink-3 m-0 leading-snug">
            <ui-icon name="info" [size]="11" class="inline align-[-2px] mr-0.5" />
            Ubicación aproximada
          </p>
        </div>
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
  protected readonly store = inject(InsightsStore);
  private readonly claimsStore = inject(ClaimsStore);
  private readonly router = inject(Router);

  private readonly mapHost = viewChild.required<ElementRef<HTMLElement>>('mapHost');

  private map: L.Map | null = null;
  private hotspotLayer: L.LayerGroup | null = null;
  private incidentLayer: L.LayerGroup | null = null;
  private resizeObserver: ResizeObserver | null = null;
  private initialViewportFitDone = false;

  protected readonly hintOpen = signal(false);
  protected readonly selectedIncidentId = signal<string | null>(null);

  protected readonly selectedSummary = computed(() => {
    const incidentId = this.selectedIncidentId();
    if (!incidentId) return null;

    const incident = this.store.incidents().find((point) => point.id === incidentId);
    if (!incident) return null;

    const claim = this.claimsStore.claims().find((row) => row.id === incidentId);
    const tier = (claim?.nivel ?? incident.tier) as RiskTier;

    return {
      id: incident.id,
      sucursal: claim?.sucursal ?? incident.sucursal,
      score: claim?.score ?? incident.score,
      ramoLabel: claim ? ramoLabel(claim.ramo) : 'Siniestro',
      tierLabel: TIER_LABELS[tier],
      tierClass: TIER_BADGE_CLASSES[tier],
      monto: claim ? formatMoneyShort(claim.monto_reclamado) : null,
      fecha: formatIncidentDate(claim?.fecha_ocurrencia ?? incident.fechaOcurrencia),
      asegurado: claim?.asegurado ?? null,
      descripcion: claim?.descripcion ?? null,
    };
  });

  constructor() {
    // Re-render markers whenever the store's hotspots or incidents change.
    effect(() => {
      const hotspots = this.store.hotspots();
      const incidents = this.store.incidents();
      if (this.map) {
        this.renderMarkers(hotspots);
        this.renderIncidents(incidents);
      }
    });
  }

  ngAfterViewInit(): void {
    this.initMap();
    this.observeMapResize();
  }

  ngOnDestroy(): void {
    this.resizeObserver?.disconnect();
    this.resizeObserver = null;
    this.map?.remove();
    this.map = null;
    this.hotspotLayer = null;
    this.incidentLayer = null;
  }

  protected toggleHint(): void {
    this.hintOpen.update((open) => !open);
    setTimeout(() => this.map?.invalidateSize({ animate: false }), 0);
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

  protected clearSelection(): void {
    this.selectedIncidentId.set(null);
  }

  protected openCase(claimId: string): void {
    void this.router.navigate(['/claims', claimId], { queryParams: insightsClaimReturnQuery() });
  }

  private initMap(): void {
    const host = this.mapHost().nativeElement;
    const panBounds = ecuadorPanBounds();

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
      opacity: 1,
      keepBuffer: 3,
      updateWhenIdle: true,
      className: 'insights-topo-tile-layer',
    }).addTo(this.map);

    this.map.on('click', () => this.selectedIncidentId.set(null));
    this.map.on('zoomend', () => this.syncLayerVisibility());

    this.hotspotLayer = L.layerGroup().addTo(this.map);
    this.incidentLayer = L.layerGroup();

    // Seed markers from whatever the store already has; the effect() in
    // the constructor keeps them in sync on subsequent loads.
    this.renderMarkers(this.store.hotspots());
    this.renderIncidents(this.store.incidents());
    this.syncLayerVisibility();

    requestAnimationFrame(() => {
      this.map?.invalidateSize({ animate: false });
      this.fitEcuadorViewport();
      this.initialViewportFitDone = true;
    });
  }

  private observeMapResize(): void {
    const host = this.mapHost().nativeElement;
    let resizeTimer: ReturnType<typeof setTimeout> | null = null;

    this.resizeObserver = new ResizeObserver(() => {
      if (!this.map) return;
      this.map.invalidateSize({ animate: false });
      if (!this.initialViewportFitDone) return;
      if (resizeTimer) clearTimeout(resizeTimer);
      resizeTimer = setTimeout(() => this.map?.invalidateSize({ animate: false }), 120);
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
      maxZoom: 8,
      animate: false,
    });
  }

  private syncLayerVisibility(): void {
    if (!this.map || !this.hotspotLayer || !this.incidentLayer) return;

    const showIncidents = this.map.getZoom() >= INCIDENT_DETAIL_MIN_ZOOM;

    if (showIncidents) {
      if (this.map.hasLayer(this.hotspotLayer)) this.hotspotLayer.remove();
      if (!this.map.hasLayer(this.incidentLayer)) this.incidentLayer.addTo(this.map);
    } else {
      if (this.map.hasLayer(this.incidentLayer)) this.incidentLayer.remove();
      if (!this.map.hasLayer(this.hotspotLayer)) this.hotspotLayer.addTo(this.map);
      this.selectedIncidentId.set(null);
    }
  }

  private renderMarkers(hotspots: readonly MapHotspot[]): void {
    if (!this.hotspotLayer) return;

    this.hotspotLayer.clearLayers();

    for (const hotspot of hotspots) {
      this.hotspotLayer.addLayer(this.createHotspotMarker(hotspot));
    }

    this.syncLayerVisibility();
  }

  private createHotspotMarker(hotspot: MapHotspot): L.Marker {
    const iconSize = hotspot.risk === 'high' ? 52 : 40;
    const icon = L.divIcon({
      className: 'insights-hotspot-leaflet-icon',
      html: buildHotspotMarkerHtml(hotspot),
      iconSize: [iconSize, iconSize],
      iconAnchor: [iconSize / 2, iconSize / 2],
    });

    const marker = L.marker([hotspot.latitude, hotspot.longitude], { icon });

    marker.bindPopup(buildHotspotPopupHtml(hotspot), {
      className: 'insights-hotspot-leaflet-popup',
      closeButton: false,
      offset: [0, -8],
    });

    marker.on('mouseover', () => marker.openPopup());
    marker.on('mouseout', () => marker.closePopup());
    marker.on('click', () => marker.openPopup());

    return marker;
  }

  private renderIncidents(incidents: readonly IncidentPoint[]): void {
    if (!this.incidentLayer) return;

    this.incidentLayer.clearLayers();

    for (const incident of incidents) {
      this.incidentLayer.addLayer(this.createIncidentMarker(incident));
    }

    this.syncLayerVisibility();
  }

  private createIncidentMarker(incident: IncidentPoint): L.CircleMarker {
    const color = INCIDENT_TIER_COLORS[incident.tier];
    const marker = L.circleMarker([incident.latitude, incident.longitude], {
      radius: incident.tier === 'rojo' ? 6 : 5,
      color,
      weight: 1,
      fillColor: color,
      fillOpacity: 0.55,
    });

    marker.bindTooltip(
      `<strong>${incident.id}</strong><br>${incident.sucursal} · score ${incident.score}`,
      { direction: 'top', offset: [0, -4], opacity: 0.92 },
    );

    marker.on('click', (event) => {
      L.DomEvent.stopPropagation(event);
      this.selectedIncidentId.set(incident.id);
    });

    return marker;
  }
}

const TIER_LABELS: Record<RiskTier, string> = {
  rojo: 'Alto',
  amarillo: 'Medio',
  verde: 'Bajo',
};

const TIER_BADGE_CLASSES: Record<RiskTier, string> = {
  rojo: 'bg-tier-red-soft text-tier-red-ink',
  amarillo: 'bg-tier-yellow-soft text-tier-yellow-ink',
  verde: 'bg-tier-green-soft text-tier-green-ink',
};

function formatIncidentDate(isoDate: string | null | undefined): string | null {
  if (!isoDate) return null;
  const [year, month, day] = isoDate.split('-');
  if (!year || !month || !day) return isoDate;
  return `${day}/${month}/${year}`;
}

const INCIDENT_TIER_COLORS: Record<IncidentPoint['tier'], string> = {
  rojo: 'var(--tier-red)',
  amarillo: 'var(--tier-yellow)',
  verde: 'var(--tier-green)',
};
