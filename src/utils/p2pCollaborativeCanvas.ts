import { CanvasStroke, PeerCanvasCursor, StrokePoint, BrushTextureStyle } from '../types';
import { p2pNetwork } from './p2pNetwork';

const COLLAB_CHANNEL = 'vangogh_collab_canvas_v1';
const bc = typeof window !== 'undefined' && 'BroadcastChannel' in window
  ? new BroadcastChannel(COLLAB_CHANNEL)
  : null;

// Stroke render function that applies authentic post-impressionist painterly texture
export function renderStrokeOnCanvas(
  ctx: CanvasRenderingContext2D,
  stroke: CanvasStroke
) {
  if (!stroke.points || stroke.points.length === 0) return;

  ctx.save();
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  const pts = stroke.points;
  const baseColor = stroke.color;
  const width = stroke.width;

  switch (stroke.brushStyle) {
    case 'starry_swirl': {
      // Dynamic spiral / swirling rhythmic strokes
      ctx.lineWidth = width;
      ctx.strokeStyle = baseColor;
      ctx.beginPath();
      ctx.moveTo(pts[0].x, pts[0].y);
      for (let i = 1; i < pts.length; i++) {
        const xc = (pts[i].x + pts[i - 1].x) / 2;
        const yc = (pts[i].y + pts[i - 1].y) / 2;
        ctx.quadraticCurveTo(pts[i - 1].x, pts[i - 1].y, xc, yc);
      }
      ctx.stroke();

      // Yellow/white luminous halo streak
      ctx.lineWidth = Math.max(1, width * 0.35);
      ctx.strokeStyle = '#fef08a';
      ctx.globalAlpha = 0.6;
      ctx.beginPath();
      ctx.moveTo(pts[0].x + 1, pts[0].y - 1);
      for (let i = 1; i < pts.length; i++) {
        ctx.lineTo(pts[i].x + 1, pts[i].y - 1);
      }
      ctx.stroke();
      break;
    }

    case 'sunflower_dab': {
      // Thick impasto dabs of ochre and golden yellow
      for (let i = 0; i < pts.length; i++) {
        const p = pts[i];
        const radius = width * (0.8 + Math.sin(i) * 0.2);

        // Base dab
        ctx.fillStyle = baseColor;
        ctx.beginPath();
        ctx.ellipse(p.x, p.y, radius, radius * 0.7, 0.35, 0, Math.PI * 2);
        ctx.fill();

        // High-contrast oil ridge
        ctx.fillStyle = '#fde047';
        ctx.globalAlpha = 0.7;
        ctx.beginPath();
        ctx.ellipse(p.x - 2, p.y - 2, radius * 0.5, radius * 0.35, 0.35, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1.0;
      }
      break;
    }

    case 'palette_knife': {
      // Flat, architectural knife application
      ctx.lineWidth = width * 1.6;
      ctx.strokeStyle = baseColor;
      ctx.lineCap = 'butt';
      ctx.beginPath();
      ctx.moveTo(pts[0].x, pts[0].y);
      for (let i = 1; i < pts.length; i++) {
        ctx.lineTo(pts[i].x, pts[i].y);
      }
      ctx.stroke();

      // Sharp shadow edge of the knife blade
      ctx.lineWidth = 1.5;
      ctx.strokeStyle = '#18181b';
      ctx.globalAlpha = 0.5;
      ctx.beginPath();
      ctx.moveTo(pts[0].x + width * 0.8, pts[0].y + 2);
      for (let i = 1; i < pts.length; i++) {
        ctx.lineTo(pts[i].x + width * 0.8, pts[i].y + 2);
      }
      ctx.stroke();
      break;
    }

    case 'almond_branch': {
      // Calligraphic Japanese woodblock inspired branch line
      ctx.lineWidth = Math.max(1, width * 0.7);
      ctx.strokeStyle = baseColor;
      ctx.beginPath();
      ctx.moveTo(pts[0].x, pts[0].y);
      for (let i = 1; i < pts.length; i++) {
        ctx.lineTo(pts[i].x, pts[i].y);
      }
      ctx.stroke();
      break;
    }

    case 'impasto':
    default: {
      // Classic heavy oil impasto with dimensional shadow and highlight
      ctx.lineWidth = width;
      ctx.strokeStyle = baseColor;
      ctx.beginPath();
      ctx.moveTo(pts[0].x, pts[0].y);
      for (let i = 1; i < pts.length; i++) {
        const xc = (pts[i].x + pts[i - 1].x) / 2;
        const yc = (pts[i].y + pts[i - 1].y) / 2;
        ctx.quadraticCurveTo(pts[i - 1].x, pts[i - 1].y, xc, yc);
      }
      ctx.stroke();

      // Highlight streak on top edge
      ctx.lineWidth = Math.max(1, width * 0.4);
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.45)';
      ctx.beginPath();
      ctx.moveTo(pts[0].x - 1, pts[0].y - 1);
      for (let i = 1; i < pts.length; i++) {
        ctx.lineTo(pts[i].x - 1, pts[i].y - 1);
      }
      ctx.stroke();

      // Shadow on bottom edge
      ctx.lineWidth = Math.max(1, width * 0.3);
      ctx.strokeStyle = 'rgba(0, 0, 0, 0.35)';
      ctx.beginPath();
      ctx.moveTo(pts[0].x + 1.5, pts[0].y + 1.5);
      for (let i = 1; i < pts.length; i++) {
        ctx.lineTo(pts[i].x + 1.5, pts[i].y + 1.5);
      }
      ctx.stroke();
      break;
    }
  }

  ctx.restore();
}

export type CollabCanvasEventListener = (event: {
  type: 'stroke' | 'cursor' | 'clear' | 'sync_request' | 'sync_response';
  payload: any;
}) => void;

class CollaborativeCanvasManager {
  private listeners: Set<CollabCanvasEventListener> = new Set();
  private localStrokes: CanvasStroke[] = [];
  private remoteCursors: Map<string, PeerCanvasCursor> = new Map();

  constructor() {
    if (bc) {
      bc.onmessage = (event) => {
        this.handleIncomingMessage(event.data);
      };
    }

    // Also hook to P2P network broadcast channel if active
    if (typeof window !== 'undefined') {
      window.addEventListener('p2p:collab_event', ((e: CustomEvent) => {
        this.handleIncomingMessage(e.detail);
      }) as EventListener);
    }
  }

  public subscribe(listener: CollabCanvasEventListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  public broadcastStroke(stroke: CanvasStroke) {
    this.localStrokes.push(stroke);
    const msg = { type: 'stroke', payload: stroke };
    this.send(msg);
  }

  public broadcastCursor(cursor: PeerCanvasCursor) {
    const msg = { type: 'cursor', payload: cursor };
    this.send(msg);
  }

  public broadcastClear(peerId: string) {
    this.localStrokes = [];
    const msg = { type: 'clear', payload: { peerId, timestamp: Date.now() } };
    this.send(msg);
  }

  public requestSync(peerId: string) {
    const msg = { type: 'sync_request', payload: { requesterId: peerId } };
    this.send(msg);
  }

  public sendSyncResponse(targetPeerId: string, strokes: CanvasStroke[]) {
    const msg = { type: 'sync_response', payload: { targetPeerId, strokes } };
    this.send(msg);
  }

  private send(data: any) {
    if (bc) {
      try {
        bc.postMessage(data);
      } catch (e) {
        console.warn('Collab BroadcastChannel error:', e);
      }
    }
    // Also broadcast over P2P network
    const dummySender: any = {
      id: 'collab_peer',
      name: 'Художник артели',
      avatarColor: 'from-amber-500 to-yellow-600',
      isAuditor: true,
    };
    p2pNetwork.broadcastMessage({
      type: 'COLLAB_CANVAS_EVENT',
      senderProfile: dummySender,
      payload: data,
      timestamp: Date.now(),
    });
  }

  private handleIncomingMessage(data: any) {
    if (!data || !data.type) return;

    if (data.type === 'stroke' && data.payload) {
      this.localStrokes.push(data.payload);
    } else if (data.type === 'cursor' && data.payload) {
      this.remoteCursors.set(data.payload.peerId, data.payload);
    } else if (data.type === 'clear') {
      this.localStrokes = [];
    }

    this.listeners.forEach((fn) => {
      try {
        fn(data);
      } catch (err) {
        console.error('Error in collab canvas listener:', err);
      }
    });
  }

  public getStrokes(): CanvasStroke[] {
    return [...this.localStrokes];
  }

  public getCursors(): PeerCanvasCursor[] {
    const now = Date.now();
    // Filter out cursors inactive for > 15 seconds
    return Array.from(this.remoteCursors.values()).filter((c) => now - c.lastActive < 15000);
  }
}

export const collabCanvasManager = new CollaborativeCanvasManager();
