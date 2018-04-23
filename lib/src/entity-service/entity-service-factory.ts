import { Injectable } from '@angular/core';
import { Store } from '@ngrx/store';

import { EntityCache } from '../reducers/entity-cache';
import { EntityDefinitionService } from '../entity-metadata/entity-definition.service';
import { EntityDispatcherFactory } from '../dispatchers/entity-dispatcher-factory';
import { EntitySelectorsFactory } from '../selectors/entity-selectors';
import {
  EntitySelectors$,
  EntitySelectors$Factory
} from '../selectors/entity-selectors$';
import { EntityService } from './entity-service';
import { EntityServiceBase } from './entity-service-base';

/**
 * Creates EntityService instances for
 * a cached collection of T entities in the ngrx store.
 */
@Injectable()
export class EntityServiceFactory {
  constructor(
    private entityDispatcherFactory: EntityDispatcherFactory,
    private entityDefinitionService: EntityDefinitionService,
    private entitySelectorsFactory: EntitySelectorsFactory,
    private entitySelectors$Factory: EntitySelectors$Factory
  ) {}

  /**
   * Create an EntityService for an entity type
   * @param entityName - name of the entity type
   */
  create<T, S$ extends EntitySelectors$<T> = EntitySelectors$<T>>(
    entityName: string
  ): EntityService<T> {
    entityName = entityName.trim();
    const definition = this.entityDefinitionService.getDefinition<T>(
      entityName
    );
    const dispatcher = this.entityDispatcherFactory.create<T>(
      entityName,
      definition.selectId,
      definition.entityDispatcherOptions
    );
    const selectors = this.entitySelectorsFactory.create<T>(
      definition.metadata
    );
    const selectors$ = this.entitySelectors$Factory.create<T, S$>(
      entityName,
      selectors
    );

    const service = new EntityServiceBase<T, S$>(
      entityName,
      dispatcher,
      selectors,
      selectors$
    );
    return service;
  }
}
