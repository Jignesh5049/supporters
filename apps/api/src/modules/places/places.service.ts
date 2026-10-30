import type { City, State } from '@supporters/shared';
import type { PrismaClient } from '../../generated/prisma/client';
import { invalidField } from '../../lib/errors';

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
}
