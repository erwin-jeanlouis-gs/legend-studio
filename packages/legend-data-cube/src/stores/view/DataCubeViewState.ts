/**
 * Copyright (c) 2020-present, Goldman Sachs
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { DataCubeGridState } from './grid/DataCubeGridState.js';
import { DataCubeEditorState } from './editor/DataCubeEditorState.js';
import {
  assertErrorThrown,
  IllegalStateError,
  uuid,
} from '@finos/legend-shared';
import { DataCubeQuerySnapshotManager } from './DataCubeQuerySnapshotManager.js';
import { DataCubeInfoState } from './DataCubeInfoState.js';
import { validateAndBuildQuerySnapshot } from '../core/DataCubeQuerySnapshotBuilder.js';
import {
  action,
  computed,
  makeObservable,
  observable,
  runInAction,
} from 'mobx';
import { DataCubeFilterEditorState } from './filter/DataCubeFilterEditorState.js';
import { DataCubeExtendManagerState } from './extend/DataCubeExtendManagerState.js';
import type { DataCubeState } from '../DataCubeState.js';
import type { DataCubeEngine } from '../core/DataCubeEngine.js';
import { AlertType } from '../../components/core/DataCubeAlert.js';
import type { DataCubeSource } from '../core/models/DataCubeSource.js';
import type { DataCubeQuery } from '../core/models/DataCubeQuery.js';

class DataCubeTask {
  uuid = uuid();
  name: string;
  startTime = Date.now();
  endTime?: number | undefined;

  constructor(name: string) {
    this.name = name;
  }

  end() {
    this.endTime = Date.now();
  }
}

export class DataCubeViewState {
  readonly dataCube: DataCubeState;
  readonly engine: DataCubeEngine;

  readonly snapshotManager: DataCubeQuerySnapshotManager;

  readonly info: DataCubeInfoState;
  readonly editor: DataCubeEditorState;
  readonly grid: DataCubeGridState;
  readonly filter: DataCubeFilterEditorState;
  readonly extend: DataCubeExtendManagerState;

  readonly runningTasks = new Map<string, DataCubeTask>();

  private _source?: DataCubeSource | undefined;

  constructor(dataCube: DataCubeState) {
    makeObservable<DataCubeViewState, '_source'>(this, {
      _source: observable,
      source: computed,
      isSourceProcessed: computed,

      runningTasks: observable,
      newTask: action,
      endTask: action,
    });

    this.dataCube = dataCube;
    this.engine = dataCube.engine;
    this.engine = dataCube.engine;

    // NOTE: snapshot manager must be instantiated before subscribers
    this.snapshotManager = new DataCubeQuerySnapshotManager(this);

    this.info = new DataCubeInfoState(this);
    this.editor = new DataCubeEditorState(this);
    this.grid = new DataCubeGridState(this);
    this.filter = new DataCubeFilterEditorState(this);
    this.extend = new DataCubeExtendManagerState(this);
  }

  get isSourceProcessed() {
    return Boolean(this._source);
  }

  get source() {
    if (!this._source) {
      throw new IllegalStateError('Source is not initialized');
    }
    return this._source;
  }

  newTask(name: string) {
    const task = new DataCubeTask(name);
    this.runningTasks.set(task.uuid, task);
    return task;
  }

  endTask(task: DataCubeTask) {
    task.end();
    this.runningTasks.delete(task.uuid);
    return task;
  }

  async initialize(initialQuery?: DataCubeQuery | undefined) {
    const task = this.newTask('Initializing');
    try {
      await Promise.all(
        [
          this.info,
          this.editor,
          this.grid,
          this.grid.controller,
          this.filter,
          this.extend,
        ].map(async (state) => {
          this.snapshotManager.registerSubscriber(state);
        }),
      );
      const baseQuery = initialQuery ?? (await this.engine.getBaseQuery());
      if (!baseQuery) {
        this.dataCube.alertAction({
          message: `Initialization Failure: No initial input provided`,
          prompt: `Make sure to either specify the initial input when setting up DataCube or the initial input getter in engine.`,
          type: AlertType.ERROR,
          actions: [],
        });
        return;
      }
      const source = await this.engine.processQuerySource(baseQuery.source);
      runInAction(() => {
        this._source = source;
      });
      const partialQuery = await this.engine.parseValueSpecification(
        baseQuery.query,
      );
      const initialSnapshot = validateAndBuildQuerySnapshot(
        partialQuery,
        this.source,
        baseQuery,
      );
      this.snapshotManager.broadcastSnapshot(initialSnapshot);
    } catch (error: unknown) {
      assertErrorThrown(error);
      this.dataCube.alertAction({
        message: `Initialization Failure: ${error.message}`,
        prompt: `Resolve the issue and reload the engine.`,
        type: AlertType.ERROR,
        actions: [],
      });
    } finally {
      this.endTask(task);
    }
  }
}
