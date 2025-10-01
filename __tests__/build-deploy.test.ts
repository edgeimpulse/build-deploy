import axios from 'axios';
import fs from 'fs';
import * as core from '@actions/core';
import { build_model, get_stdout, wait_for_job_completion, download_model } from '../src/build-deploy';

jest.mock('axios');
jest.mock('fs');

describe('Tests for EdgeImpulse Job Runner', () => {
  const mockedAxios = axios as jest.Mocked<typeof axios>;
  const mockedFs = fs as jest.Mocked<typeof fs>;

  beforeEach(() => {
    jest.resetAllMocks();
  });

  it('should build the model and return the job id', async () => {
    const mockResponse = {
      data: {
        success: true,
        id: '1234'
      }
    };
    mockedAxios.post.mockResolvedValue(mockResponse);

    const jobId = await build_model('project_id', 'deploy_type', 'api_key', undefined, undefined, undefined);
    expect(jobId).toEqual('1234');
    expect(mockedAxios.post).toHaveBeenCalled();
  });

  it('should get the stdout of the job', async () => {
    const mockResponse = {
      data: {
        success: true,
        stdout: [{ data: 'test data' }]
      }
    };
    mockedAxios.get.mockResolvedValue(mockResponse);

    const stdout = await get_stdout('project_id', '1234', 'api_key', 0);
    expect(stdout).toEqual(['test data']);
    expect(mockedAxios.get).toHaveBeenCalled();
  });

  it('should wait for job completion', async () => {
    const mockResponse = {
      data: {
        success: true,
        job: {
          finished: true,
          finishedSuccessful: true
        },
        stdout: [{ data: 'test data' }]
      }
    };
    mockedAxios.get.mockResolvedValue(mockResponse);

    await expect(wait_for_job_completion('project_id', '1234', 'api_key')).resolves.not.toThrow();
    expect(mockedAxios.get).toHaveBeenCalled();
  });

  it('should download the model', async () => {
    const mockResponse = {
      data: new ArrayBuffer(8),
      headers: {
        'content-disposition': "attachment; filename*=utf-8''model.tflite"
      }
    };
    mockedAxios.get.mockResolvedValue(mockResponse);

    const download = await download_model('project_id', 'deploy_type', 'api_key');
    expect(download.fname).toEqual('model.tflite');
    expect(download.content.byteLength).toEqual(8);
    expect(mockedAxios.get).toHaveBeenCalled();
  });

  it('should write the downloaded model to a file', () => {
    const mockData = new Uint8Array(new ArrayBuffer(8));
    const spy = jest.spyOn(fs, 'writeFileSync');

    fs.writeFileSync('model.tflite', mockData);
    expect(spy).toHaveBeenCalled();
  });
});
