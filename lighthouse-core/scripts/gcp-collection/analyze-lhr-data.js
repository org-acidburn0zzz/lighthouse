#!/usr/bin/env node

/**
 * @license Copyright 2020 The Lighthouse Authors. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

const {readdirSync, readFileSync, writeFileSync} = require('fs');
const { join } = require('path');

const directory = process.argv[2];
const audit = process.argv[3];
if (!directory) throw new Error('No directory provided\nUsage: $0 <lhr directory> <audit id>');

if (!audit) throw new Error('No audit provided');

const urlDirs = readdirSync(directory, {withFileTypes: true })
.filter(dirent => dirent.isDirectory());

let totalPass = 0;
let totalFail = 0;
const failSet = new Set();
const runResults = [];

for (const dir of urlDirs) {
  const url = dir.name;
  const path = join(directory, url);
  const runs = readdirSync(path, {withFileTypes: true});
  const entry = {
    url,
    /** @type {Array<any>} */
    runs: [],
  };
  for (const run of runs) {
    if (run.name === '.DS_Store') continue;

    if (!run.isDirectory()) throw new Error(`Unexpected directory "${run.name}" encountered`);

    const lhrPath = join(path, run.name, 'lhr.json');
    console.log(lhrPath);
    const data = readFileSync(lhrPath, 'utf8');

    /** @type {LH.Result | undefined} */
    let lhrData;
    try {
      lhrData = JSON.parse(data);
    } catch (error) {
      console.log('Error parsing: ' + url);
    }

    if (!lhrData) continue;

    const auditResult = lhrData.audits[audit].score;
    if (auditResult && auditResult == 1) {
      totalPass++;
    } else {
      totalFail++;
      failSet.add(url);
    }

    const runData = {
      index: run.name,
      auditResult,
    }
    entry.runs.push(runData);
  }

  runResults.push(entry);
}

const results = {
  summary: {
    passes: totalPass,
    fails: totalFail,
    failingUrls: Array.from(failSet),
  },
  runResults,
}

writeFileSync('analyze-results.json', JSON.stringify(results, null, 2), 'utf8');
