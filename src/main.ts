import * as core from '@actions/core';
import { build_model, wait_for_job_completion, download_model } from './build-deploy';
import fs from 'fs';

const project_id = core.getInput('project_id', { required: true });
const api_key = core.getInput('api_key', { required: true });
const deploy_type = core.getInput('deployment_type', { required: false }) || 'tflite-eon';
const impulse_id = parseInt(core.getInput('impulse_id', { required: false })) || undefined;
const engine = core.getInput('engine', { required: false }) || undefined;
const model_type = core.getInput('model_type', { required: false }) || 'float32';

async function run(): Promise<void> {
  try {
    const job_id = await build_model(project_id, deploy_type, api_key, impulse_id, engine, model_type);
    console.log('Job ID is: ', job_id);

    await wait_for_job_completion(project_id, job_id, api_key);
    console.log('Job', job_id, 'is finished');

    const { fname, content } = await download_model(project_id, deploy_type, api_key, impulse_id, engine, model_type);
    console.log('Output file is ', content.byteLength, ' bytes');
    const bufferView = new Uint8Array(content);

    fs.writeFileSync(fname, bufferView);
    console.log('Written job output to ', fname);

    core.setOutput('deployment_file_name', fname);
  } catch (error) {
    if (error instanceof Error) core.setFailed(error.message);
  }
}

run();
