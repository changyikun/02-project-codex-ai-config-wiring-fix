import { promises as fs } from 'node:fs';
import path from 'node:path';
import type { FamilyBackgroundConfig, RouteStressConfig } from './types';

export interface RegistryState {
  family: FamilyBackgroundConfig[];
  stressRoutes: RouteStressConfig[];
  loadedAt: string;
}

const baseDir = path.resolve(process.cwd(), 'server/config/foundation');
const familyFile = path.join(baseDir, 'family-backgrounds.json');
const routeStressFile = path.join(baseDir, 'route-stress.json');

export class FoundationConfigRegistry {
  private state?: RegistryState;

  async load(force = false): Promise<RegistryState> {
    if (this.state && !force) {
      return this.state;
    }

    const [familyRaw, routeStressRaw] = await Promise.all([
      fs.readFile(familyFile, 'utf8'),
      fs.readFile(routeStressFile, 'utf8'),
    ]);

    const family = JSON.parse(familyRaw) as FamilyBackgroundConfig[];
    const stressRoutes = JSON.parse(routeStressRaw) as RouteStressConfig[];
    this.state = {
      family,
      stressRoutes,
      loadedAt: new Date().toISOString(),
    };
    return this.state;
  }

  async reload(): Promise<RegistryState> {
    return this.load(true);
  }

  async getFamilyBackgrounds(): Promise<FamilyBackgroundConfig[]> {
    return (await this.load()).family;
  }

  async getRouteStressConfig(routeId: string): Promise<RouteStressConfig | undefined> {
    return (await this.load()).stressRoutes.find((item) => item.routeId === routeId);
  }

  async upsertRouteStress(config: RouteStressConfig): Promise<void> {
    const state = await this.load();
    const next = [...state.stressRoutes];
    const index = next.findIndex((item) => item.routeId === config.routeId);
    if (index >= 0) {
      next[index] = config;
    } else {
      next.push(config);
    }
    await fs.writeFile(routeStressFile, JSON.stringify(next, null, 2), 'utf8');
    await this.reload();
  }
}
