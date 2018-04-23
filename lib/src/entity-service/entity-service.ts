import { Injectable } from '@angular/core';
import { Action, Store } from '@ngrx/store';

import { Observable } from 'rxjs/Observable';

import { Dictionary, IdSelector, Update } from '../utils';
import { EntityAction } from '../actions/entity-action';
import { EntityOp } from '../actions/entity-op';
import { EntityCache } from '../reducers/entity-cache';
import { EntityDispatcher } from '../dispatchers/entity-dispatcher';
import { EntitySelectors } from '../selectors/entity-selectors';
import { EntitySelectors$ } from '../selectors/entity-selectors$';

// tslint:disable:member-ordering
/**
 * A facade for managing
 * a cached collection of T entities in the ngrx store.
 */
export interface EntityService<T>
  extends EntityDispatcher<T>,
    EntitySelectors$<T> {
  /** Create an EntityAction for this collection */
  createEntityAction(op: EntityOp, payload?: any): EntityAction<T>;

  /** Dispatch an action to the NgRx Store */
  dispatch(action: Action): void;

  /** All selector functions of the entity collection */
  readonly selectors: EntitySelectors<T>;

  /** All selectors$ (observables of the selectors of entity collection properties) */
  readonly selectors$: EntitySelectors$<T>;

  /** The Ngrx Store for the EntityCache */
  readonly store: Store<EntityCache>;
}
