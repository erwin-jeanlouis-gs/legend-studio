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

import { observer } from 'mobx-react-lite';
import type { AdhocQueryDataCubeSourceBuilderState } from '../../../stores/builder/source/AdhocQueryDataCubeSourceBuilderState.js';

export const AdhocQueryDataCubeSourceBuilder = observer(
  (props: { sourceBuilder: AdhocQueryDataCubeSourceBuilderState }) => {
    return (
      <div className="flex h-full w-full p-2">
        <div className="flex h-6 items-center text-neutral-500">
          This is a work-in-progress.
        </div>
      </div>
    );
  },
);
