import type { Area, City, State } from '@supporters/shared';
import type { PrismaClient } from '../../generated/prisma/client';
import { invalidField } from '../../lib/errors';

interface AreaRow {
  isAllIndia: boolean;
  areaStateIds: string[];
  areaCityIds?: string[];
}

const toState = (row: { id: string; code: string; name: string }): State => ({
  id: row.id,
  code: row.code,
  name: row.name,
});

export const toCity = (row: { id: string; name: string; state: { code: string } }): City => ({
  id: row.id,
  name: row.name,
  stateCode: row.state.code,
});

export class PlacesService {
  constructor(private readonly prisma: PrismaClient) {}

  listStates(): Promise<State[]> {
    return this.prisma.state
      .findMany({ orderBy: { name: 'asc' } })
      .then((rows) => rows.map(toState));
  }

  /** Null when the state code is unknown. */
  async listCities(stateCode: string): Promise<City[] | null> {
    const state = await this.prisma.state.findUnique({
      where: { code: stateCode },
      include: { cities: { orderBy: { name: 'asc' } } },
    });
    return state ? state.cities.map((city) => toCity({ ...city, state })) : null;
  }

  /** The city and its state, or a 400 naming `path`. */
  async requireCity(cityId: string, path: string) {
    const city = await this.prisma.city.findUnique({ where: { id: cityId } });
    if (!city) throw invalidField(path, 'Unknown city');
    return city;
  }

  /** Checks every id in a service or shipping area exists. */
  async assertArea(area: { stateIds: string[]; cityIds: string[] }, path: string) {
    const [states, cities] = await Promise.all([
      area.stateIds.length ? this.prisma.state.count({ where: { id: { in: area.stateIds } } }) : 0,
      area.cityIds.length ? this.prisma.city.count({ where: { id: { in: area.cityIds } } }) : 0,
    ]);
    if (states !== area.stateIds.length) throw invalidField(`${path}.stateIds`, 'Unknown state');
    if (cities !== area.cityIds.length) throw invalidField(`${path}.cityIds`, 'Unknown city');
  }

  /** Expands stored area ids into names, with one query per kind for the whole page. */
  async describeAreas(rows: AreaRow[]): Promise<Area[]> {
    const stateIds = [...new Set(rows.flatMap((row) => row.areaStateIds))];
    const cityIds = [...new Set(rows.flatMap((row) => row.areaCityIds ?? []))];
    const [states, cities] = await Promise.all([
      stateIds.length ? this.prisma.state.findMany({ where: { id: { in: stateIds } } }) : [],
      cityIds.length
        ? this.prisma.city.findMany({ where: { id: { in: cityIds } }, include: { state: true } })
        : [],
    ]);
    const stateById = new Map(states.map((state) => [state.id, toState(state)]));
    const cityById = new Map(cities.map((city) => [city.id, toCity(city)]));
    return rows.map((row) => ({
      allIndia: row.isAllIndia,
      states: row.areaStateIds.flatMap((id) => stateById.get(id) ?? []),
      cities: (row.areaCityIds ?? []).flatMap((id) => cityById.get(id) ?? []),
    }));
  }
}
