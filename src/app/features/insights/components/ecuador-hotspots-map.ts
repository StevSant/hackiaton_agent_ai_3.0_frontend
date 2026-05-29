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
import { ActivatedRoute, Router } from '@angular/router';
import * as L from 'leaflet';

import { ClaimsStore } from '@core/state/claims.store';
import { Icon } from '@shared/ui/icon';
import { formatMoneyShort, insightsClaimReturnQuery, MAP_CLAIM_QUERY, ramoIcon, ramoLabel, type RiskTier } from '@shared/utils';
import { RiskRing } from '@shared/ui/risk-ring';
import { InsightsStore, type IncidentPoint } from '../services/insights.store';
import type { MapHotspot } from '../models';
import {
  ECUADOR_CITY_COORDS,
  normalizeToCity,
} from '../utils/ecuador-city-coords';
import {
  ECUADOR_MAP_FIT_PADDING,
  ecuadorPanBounds,
  ecuadorViewportBounds,
} from '../utils/ecuador-map-bounds';
import {
  buildHotspotMarkerHtml,
  buildHotspotPopupHtml,
  buildSelectedIncidentPinHtml,
  incidentTierHex,
} from '../utils/map-hotspot-marker';

const TOPO_TILE_URL = 'https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png';
const TOPO_ATTRIBUTION =
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors, SRTM | Map style: &copy; OpenTopoMap';
/** Below this zoom only city hotspots are shown; at/above it, individual cases appear. */
const INCIDENT_DETAIL_MIN_ZOOM = 9;

@Component({
  selector: 'insights-ecuador-map',
  standalone: true,
  imports: [Icon, RiskRing],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div
      class="centinela-panel relative insights-map-container overflow-hidden w-full h-full"
    >
      <div #mapHost class="insights-leaflet-host absolute inset-0 z-0"></div>

      <div class="absolute top-2.5 left-2.5 z-[1000] flex flex-col items-start gap-1.5 max-w-[min(100%,280px)]">
        <button
          type="button"
          class="insights-glass-card inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border border-line shadow-sm text-left hover:bg-surface transition-colors"
          (click)="toggleHint()"
          [attr.aria-expanded]="hintOpen()"
          aria-controls="insights-map-hint"
        >
          <span class="w-1.5 h-1.5 rounded-full bg-brand animate-pulse shrink-0"></span>
          <span class="text-[10.5px] font-mono font-medium text-brand uppercase tracking-wide">
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
            class="insights-map-case-card insights-map-case-card--{{ summary.tier }}"
            role="dialog"
            aria-label="Resumen del siniestro"
          >
            <header class="insights-map-case-card__header">
              <button
                type="button"
                class="insights-map-case-card__close"
                (click)="clearSelection()"
                aria-label="Cerrar resumen"
              >
                <ui-icon name="close" [size]="15" />
              </button>

              <div class="insights-map-case-card__hero">
                <ui-risk-ring [score]="summary.score" [size]="48" [stroke]="4" />
                <div class="insights-map-case-card__hero-text min-w-0">
                  <span class="insights-map-case-card__id">{{ summary.id }}</span>
                  <span class="insights-map-case-card__tier-badge">{{ summary.tierLabel }}</span>
                </div>
              </div>
            </header>

            <div class="insights-map-case-card__body">
              <div class="insights-map-case-card__ramo">
                <span class="insights-map-case-card__ramo-icon">
                  <ui-icon [name]="summary.ramoIcon" [cacheKey]="summary.id" [size]="14" />
                </span>
                <span class="truncate">{{ summary.ramoLabel }}</span>
              </div>

              <div class="insights-map-case-card__stats">
                @if (summary.monto) {
                  <div class="insights-map-case-card__stat">
                    <ui-icon name="payments" [size]="13" />
                    <span class="tabular-nums">{{ summary.monto }}</span>
                  </div>
                }
                @if (summary.fecha) {
                  <div class="insights-map-case-card__stat">
                    <ui-icon name="event" [size]="13" />
                    <span>{{ summary.fecha }}</span>
                  </div>
                }
              </div>

              @if (summary.sucursal) {
                <div class="insights-map-case-card__row">
                  <ui-icon name="location_on" [size]="13" />
                  <span class="truncate">{{ summary.sucursal }}</span>
                </div>
              }

              @if (summary.asegurado) {
                <div class="insights-map-case-card__row">
                  <ui-icon name="person" [size]="13" />
                  <span class="truncate">{{ summary.asegurado }}</span>
                </div>
              }

              @if (summary.alertCodes.length > 0) {
                <div class="insights-map-case-card__alerts">
                  @for (code of summary.alertCodes; track code) {
                    <span class="insights-map-case-card__alert-chip">{{ code }}</span>
                  }
                  @if (summary.alertCount > summary.alertCodes.length) {
                    <span class="insights-map-case-card__alert-more">
                      +{{ summary.alertCount - summary.alertCodes.length }}
                    </span>
                  }
                </div>
              }

              @if (summary.descripcion) {
                <p class="insights-map-case-card__desc">{{ summary.descripcion }}</p>
              }
            </div>

            <footer class="insights-map-case-card__footer">
              <button
                type="button"
                class="insights-map-case-card__cta"
                (click)="openCase(summary.id)"
              >
                Ver detalle del caso
                <ui-icon name="arrow_forward" [size]="14" />
              </button>
            </footer>
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
  private readonly route = inject(ActivatedRoute);

  private readonly mapHost = viewChild.required<ElementRef<HTMLElement>>('mapHost');

  private map: L.Map | null = null;
  private hotspotLayer: L.LayerGroup | null = null;
  private incidentLayer: L.LayerGroup | null = null;
  private resizeObserver: ResizeObserver | null = null;
  private initialViewportFitDone = false;
  private pendingFocusClaimId: string | null = this.route.snapshot.queryParamMap.get(MAP_CLAIM_QUERY);

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
      tier,
      sucursal: claim?.sucursal ?? incident.sucursal ?? null,
      score: claim?.score ?? incident.score,
      ramoLabel: claim ? ramoLabel(claim.ramo) : 'Siniestro',
      ramoIcon: claim ? ramoIcon(claim.ramo) : 'report',
      tierLabel: TIER_LABELS[tier],
      monto: claim ? formatMoneyShort(claim.monto_reclamado) : null,
      fecha: formatIncidentDate(claim?.fecha_ocurrencia ?? incident.fechaOcurrencia),
      asegurado: claim?.asegurado ?? null,
      descripcion: claim?.descripcion ?? null,
      alertCodes: (claim?.alertas ?? []).slice(0, 3).map((alert) => alert.code),
      alertCount: claim?.alertas?.length ?? 0,
    };
  });

  constructor() {
    // Re-render markers whenever the store's hotspots or incidents change.
    effect(() => {
      const hotspots = this.store.hotspots();
      const incidents = this.store.incidents();
      const selectedId = this.selectedIncidentId();
      void selectedId;
      if (this.map) {
        this.renderMarkers(hotspots);
        this.renderIncidents(incidents);
      }
    });

    effect(() => {
      if (!this.pendingFocusClaimId || !this.map || this.store.loading()) return;
      this.store.incidents();
      queueMicrotask(() => this.tryFocusPendingClaim());
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
      if (this.pendingFocusClaimId) {
        this.tryFocusPendingClaim();
      } else {
        this.fitEcuadorViewport();
      }
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
    }
  }

  private renderIncidents(incidents: readonly IncidentPoint[]): void {
    if (!this.incidentLayer) return;

    this.incidentLayer.clearLayers();

    const selectedId = this.selectedIncidentId();
    const hasSelection = selectedId !== null;
    const ordered = selectedId
      ? [...incidents].sort((left, right) => {
          if (left.id === selectedId) return 1;
          if (right.id === selectedId) return -1;
          return 0;
        })
      : incidents;

    for (const incident of ordered) {
      this.incidentLayer.addLayer(this.createIncidentMarker(incident, hasSelection));
    }

    this.syncLayerVisibility();
  }

  private createIncidentMarker(incident: IncidentPoint, hasSelection: boolean): L.Layer {
    const isSelected = this.selectedIncidentId() === incident.id;
    const color = incidentTierHex(incident.tier);
    const latLng: L.LatLngExpression = [incident.latitude, incident.longitude];

    const bindSelect = (layer: L.Layer) => {
      layer.on('click', (event: L.LeafletMouseEvent) => {
        L.DomEvent.stopPropagation(event);
        this.selectedIncidentId.set(incident.id);
      });
    };

    if (isSelected) {
      const pin = L.marker(latLng, {
        icon: L.divIcon({
          className: 'insights-incident-pin-icon',
          html: buildSelectedIncidentPinHtml(incident.tier, incident.id),
          iconSize: [28, 40],
          iconAnchor: [14, 40],
        }),
        zIndexOffset: 1000,
      });

      bindSelect(pin);
      return pin;
    }

    const marker = L.circleMarker(latLng, {
      radius: incident.tier === 'rojo' ? 5 : 4,
      color,
      weight: 1,
      fillColor: color,
      fillOpacity: hasSelection ? 0.2 : 0.55,
      opacity: hasSelection ? 0.22 : 1,
    });

    marker.bindTooltip(
      `<strong>${incident.id}</strong><br>${incident.sucursal} · score ${incident.score}`,
      { direction: 'top', offset: [0, -4], opacity: 0.92 },
    );

    bindSelect(marker);
    return marker;
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

  private tryFocusPendingClaim(): void {
    const claimId = this.pendingFocusClaimId;
    if (!claimId || !this.map) return;

    const incident = this.store.incidents().find((point) => point.id === claimId);
    if (incident) {
      this.focusMapOnClaim(incident.latitude, incident.longitude, claimId);
      this.pendingFocusClaimId = null;
      this.clearMapClaimQueryParam();
      return;
    }

    const claim = this.claimsStore.findById(claimId);
    if (!claim) return;

    const city =
      normalizeToCity(claim.sucursal) ??
      normalizeToCity(claim.ciudad) ??
      claim.ciudad;
    const coords = ECUADOR_CITY_COORDS[city];
    if (!coords) return;

    this.focusMapOnClaim(coords.latitude, coords.longitude, claimId);
    this.pendingFocusClaimId = null;
    this.clearMapClaimQueryParam();
  }

  private focusMapOnClaim(latitude: number, longitude: number, claimId?: string): void {
    if (!this.map) return;

    this.hintOpen.set(false);

    if (claimId && this.store.incidents().some((point) => point.id === claimId)) {
      this.selectedIncidentId.set(claimId);
    } else {
      this.selectedIncidentId.set(null);
    }

    const zoom = Math.max(INCIDENT_DETAIL_MIN_ZOOM, 10);
    this.map.setView([latitude, longitude], zoom, { animate: false });
    this.syncLayerVisibility();
    this.renderIncidents(this.store.incidents());
  }

  private clearMapClaimQueryParam(): void {
    if (!this.route.snapshot.queryParamMap.has(MAP_CLAIM_QUERY)) return;

    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { [MAP_CLAIM_QUERY]: null },
      queryParamsHandling: 'merge',
      replaceUrl: true,
    });
  }
}

const TIER_LABELS: Record<RiskTier, string> = {
  rojo: 'Alto',
  amarillo: 'Medio',
  verde: 'Bajo',
};

function formatIncidentDate(isoDate: string | null | undefined): string | null {
  if (!isoDate) return null;
  const [year, month, day] = isoDate.split('-');
  if (!year || !month || !day) return isoDate;
  return `${day}/${month}/${year}`;
}
