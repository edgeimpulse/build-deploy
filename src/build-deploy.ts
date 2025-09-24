import axios, { AxiosResponse, AxiosError, isAxiosError } from 'axios'; // eslint-disable-line import/named

type Job = {
  success: boolean;
  error: string;
  id: string;
  stdout: { data: string }[];
  job: {
    finished: boolean;
    finishedSuccessful: boolean;
  };
};

type Download = {
  fname: string;
  content: ArrayBuffer;
};

export async function build_model(
  project_id: string,
  deploy_type: string,
  api_key: string,
  impulse_id: number | undefined,
  engine: string | undefined
): Promise<string> {
  if (!project_id) {
    throw new Error('project_id parameter is missing or empty.');
  }

  if (!deploy_type) {
    throw new Error('deploy_type parameter is missing or empty.');
  }

  if (!api_key) {
    throw new Error('api_key parameter is missing or empty.');
  }

  const url = `https://studio.edgeimpulse.com/v1/api/${project_id}/jobs/build-ondevice-model`;
  const params = { type: deploy_type, impulseId: impulse_id };
  const payload = { engine: engine || 'tflite-eon' };
  const headers = {
    'x-api-key': api_key,
    'Accept': 'application/json',
    'Content-Type': 'application/json'
  };

  try {
    const response: AxiosResponse<Job> = await axios.post(url, payload, { headers, params });
    const body = response.data;
    if (!body.success) {
      throw new Error(body.error);
    }
    return body.id;
  } catch (err) {
    if (isAxiosError(err)) {
      // Handle specific Axios errors here
      const axiosError = err as AxiosError<Job>;
      if (axiosError.response) {
        console.error(`Server responded with status code ${axiosError.response.status}`);
      } else if (axiosError.request) {
        console.error('No response was received');
      }
    } else if (err instanceof Error) {
      // Handle generic errors here
      console.error(err.message);
    } else {
      // This will handle any other exceptions
      console.error(err);
    }
    throw err;
  }
}

export async function get_stdout(
  project_id: string,
  job_id: string,
  api_key: string,
  skip_line_no: number
): Promise<string[]> {
  const url = `https://studio.edgeimpulse.com/v1/api/${project_id}/jobs/${job_id}/stdout`;
  const headers = {
    'x-api-key': api_key,
    'Accept': 'application/json',
    'Content-Type': 'application/json'
  };

  const response: AxiosResponse<Job> = await axios.get(url, { headers });
  const body = response.data;
  if (!body.success) {
    throw new Error(body.error);
  }
  const stdout = body.stdout.reverse();
  return stdout.slice(skip_line_no).map(x => x.data);
}

export async function wait_for_job_completion(project_id: string, job_id: string, api_key: string): Promise<void> {
  let skip_line_no = 0;
  const url = `https://studio.edgeimpulse.com/v1/api/${project_id}/jobs/${job_id}/status`;
  const headers = {
    'x-api-key': api_key,
    'Accept': 'application/json',
    'Content-Type': 'application/json'
  };

  return new Promise((resolve, reject) => {
    const pollJobStatus = async (): Promise<void> => {
      try {
        const response: AxiosResponse<Job> = await axios.get(url, { headers });
        const body = response.data;
        if (!body.success) {
          throw new Error(body.error);
        }

        const stdout = await get_stdout(project_id, job_id, api_key, skip_line_no);
        for (const l of stdout) {
          console.log(l);
        }
        skip_line_no += stdout.length;

        if (!body.job.finished) {
          setTimeout(pollJobStatus, 1000); // Poll again after 1 second
        } else {
          if (!body.job.finishedSuccessful) {
            throw new Error('Job failed');
          } else {
            resolve();
          }
        }
      } catch (error) {
        reject(error);
      }
    };

    pollJobStatus();
  });
}

export async function download_model(project_id: string, deploy_type: string, api_key: string): Promise<Download> {
  const url = `https://studio.edgeimpulse.com/v1/api/${project_id}/deployment/download`;
  const params = { type: deploy_type };
  const headers = {
    'x-api-key': api_key,
    'Accept': 'application/json',
    'Content-Type': 'application/json'
  };

  const response = await axios.get<ArrayBuffer>(url, {
    headers,
    params,
    responseType: 'arraybuffer'
  });
  const d = response.headers['content-disposition'];
  const fname = d.match(/filename\*?=(.+)/)[1].replace("utf-8''", '');

  return { fname, content: response.data };
}
