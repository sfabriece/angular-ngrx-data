import { Inject, Injectable } from '@angular/core';
import {
  createFeatureSelector,
  createSelector,
  Selector,
  MemoizedSelector
} from '@ngrx/store';

import { Observable } from 'rxjs/Observable';

import { Dictionary } from '../utils/ngrx-entity-models';
import { EntityCache } from '../reducers/entity-cache';
import { ENTITY_CACHE_NAME_TOKEN } from '../reducers/constants';
import { EntityCollection } from '../reducers/entity-collection';
import { EntityCollectionCreator } from '../reducers/entity-collection-creator';
import { EntityFilterFn } from '../entity-metadata/entity-filters';
import { EntityMetadata } from '../entity-metadata/entity-metadata';

/**
 * The selector functions for entity collection members,
 * Selects from the entity collection to the collection member
 * Contrast with {EntitySelectors}.
 */
export interface CollectionSelectors<T> {
  readonly [selector: string]: any;

  /** Count of entities in the cached collection. */
  readonly selectCount: MemoizedSelector<EntityCollection<T>, number>;

  /** All entities in the cached collection. */
  readonly selectEntities: MemoizedSelector<EntityCollection<T>, T[]>;

  /** Map of entity keys to entities */
  readonly selectEntityMap: (c: EntityCollection<T>) => Dictionary<T>;

  /** Filter pattern applied by the entity collection's filter function */
  readonly selectFilter: (c: EntityCollection<T>) => string;

  /** Entities in the cached collection that pass the filter function */
  readonly selectFilteredEntities: MemoizedSelector<EntityCollection<T>, T[]>;

  /** Keys of the cached collection, in the collection's native sort order */
  readonly selectKeys: (c: EntityCollection<T>) => string[] | number[];

  /** True when the collection has been fully loaded. */
  readonly selectLoaded: (c: EntityCollection<T>) => boolean;

  /** True when a multi-entity query command is in progress. */
  readonly selectLoading: (c: EntityCollection<T>) => boolean;

  /** Original entity values for entities with unsaved changes */
  readonly selectOriginalValues: (c: EntityCollection<T>) => Dictionary<T>;
}

/**
 * The selector functions for entity collection members,
 * Selects from store root, through EntityCache, to the entity collection member
 * Contrast with {CollectionSelectors}.
 */
export interface EntitySelectors<T> {
  readonly [name: string]: MemoizedSelector<EntityCollection<T>, any> | string;

  /** Name of the entity collection for these selectors */
  readonly entityName: string;

  /** The cached EntityCollection itself */
  readonly selectCollection: MemoizedSelector<Object, EntityCollection<T>>;

  /** Count of entities in the cached collection. */
  readonly selectCount: MemoizedSelector<Object, number>;

  /** All entities in the cached collection. */
  readonly selectEntities: MemoizedSelector<Object, T[]>;

  /** Map of entity keys to entities */
  readonly selectEntityMap: MemoizedSelector<Object, Dictionary<T>>;

  /** Filter pattern applied by the entity collection's filter function */
  readonly selectFilter: MemoizedSelector<Object, string>;

  /** Entities in the cached collection that pass the filter function */
  readonly selectFilteredEntities: MemoizedSelector<Object, T[]>;

  /** Keys of the cached collection, in the collection's native sort order */
  readonly selectKeys: MemoizedSelector<Object, string[] | number[]>;

  /** True when the collection has been fully loaded. */
  readonly selectLoaded: MemoizedSelector<Object, boolean>;

  /** True when a multi-entity query command is in progress. */
  readonly selectLoading: MemoizedSelector<Object, boolean>;

  /** Original entity values for entities with unsaved changes */
  readonly selectOriginalValues: MemoizedSelector<Object, Dictionary<T>>;
}

@Injectable()
export class EntitySelectorsFactory {
  selectEntityCache: Selector<Object, EntityCache>;

  constructor(
    @Inject(ENTITY_CACHE_NAME_TOKEN) cacheName: string,
    private entityCollectionCreator: EntityCollectionCreator
  ) {
    this.selectEntityCache = createFeatureSelector<EntityCache>(cacheName);
  }

  /**
   * Create the NgRx selector from the store root to the named collection
   * @param entityName the name of the collection
   */
  createCollectionSelector<
    T = any,
    C extends EntityCollection<T> = EntityCollection<T>
  >(entityName: string) {
    const getCollection = (cache: EntityCache = {}) =>
      <C>(cache[entityName] ||
        this.entityCollectionCreator.create<T>(entityName));
    return createSelector(this.selectEntityCache, getCollection);
  }

  /**
   * Creates the ngrx/entity selectors or selector functions for an entity collection.
   *
   * Based on `@ngrx/entity/state_selectors.ts`
   *
   * @param metadata - EntityMetadata for the collection.
   * May be partial but much have `entityName`.
   */
  createCollectionSelectors<
    T,
    S extends CollectionSelectors<T> = CollectionSelectors<T>
  >(metadata: Partial<EntityMetadata<T>>): S {
    const selectKeys = (c: EntityCollection<T>) => c.ids;
    const selectEntityMap = (c: EntityCollection<T>) => c.entities;

    const selectEntities = createSelector(
      selectKeys,
      selectEntityMap,
      (keys: (number | string)[], entities: Dictionary<T>): T[] =>
        keys.map(key => entities[key] as T)
    );

    const selectCount = createSelector(selectKeys, keys => keys.length);

    // EntityCollection selectors that go beyond the ngrx/entity/EntityState selectors
    const selectFilter = (c: EntityCollection<T>) => c.filter;

    const filterFn = metadata.filterFn;
    const selectFilteredEntities = filterFn
      ? createSelector(
          selectEntities,
          selectFilter,
          (entities: T[], pattern: any): T[] => filterFn(entities, pattern)
        )
      : selectEntities;

    const selectLoaded = (c: EntityCollection<T>) => c.loaded;
    const selectLoading = (c: EntityCollection<T>) => c.loading;
    const selectOriginalValues = (c: EntityCollection<T>) => c.originalValues;

    // Create collection selectors for each `additionalCollectionState` property.
    // These all extend from `selectCollection`
    const extra = metadata.additionalCollectionState || {};
    const extraSelectors: {
      [name: string]: Selector<EntityCollection<T>, any>;
    } = {};
    Object.keys(extra).forEach(k => {
      extraSelectors['select' + k[0].toUpperCase() + k.slice(1)] = (
        c: EntityCollection<T>
      ) => (<any>c)[k];
    });

    return {
      selectCount,
      selectEntities,
      selectEntityMap,
      selectFilter,
      selectFilteredEntities,
      selectKeys,
      selectLoaded,
      selectLoading,
      selectOriginalValues,
      ...extraSelectors
    } as S;
  }

  /**
   * Creates the ngrx/entity selectors or selector functions for an entity collection
   * that an {EntitySelectors$Factory} turns into selectors$.
   *
   * Based on `@ngrx/entity/state_selectors.ts`
   * Differs in that these selectors select from the NgRx store root,
   * through the collection, to the collection members.
   *
   * @param metadata - EntityMetadata for the collection.
   * May be partial but much have `entityName`.
   */
  create<T, S extends EntitySelectors<T> = EntitySelectors<T>>(
    metadata: Partial<EntityMetadata<T>>
  ): S {
    const entityName = metadata.entityName;
    const selectCollection = this.createCollectionSelector<T>(entityName);
    const collectionSelectors = this.createCollectionSelectors(metadata);

    const entitySelectors: {
      [name: string]: MemoizedSelector<EntityCollection<T>, any>;
    } = {};
    Object.keys(collectionSelectors).forEach(k => {
      entitySelectors[k] = createSelector(
        selectCollection,
        collectionSelectors[k]
      );
    });

    return {
      entityName,
      selectCollection,
      ...entitySelectors
    } as S;
  }
}
