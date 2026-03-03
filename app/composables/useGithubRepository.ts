import ky, { HTTPError, type Options } from 'ky'

export const useGithubRepository = async <ResponseData = unknown, Response = ResponseData>(
    endpoint: string,
    options?: Options
): Promise<Response> => {

    const headers = {
        'Accept': 'application/json',
        ...options?.headers ? options.headers : {},
    }

    let response: Response
    try {
        response = await ky(endpoint, {
            ...options,
            prefixUrl: `https://api.github.com/repos`,
            timeout: false,
            retry: 0,
            hooks: {
                beforeRequest: [(request) => Object.entries(headers).forEach(([key, value]) => request.headers.set(key, value as string))],
                beforeError: [
                    async (error: HTTPError) => {
                        response = (await error.response.json()) as Response;
                        error.name = 'ResponseError';
                        return error;
                    },
                ],
                ...options?.hooks ? options.hooks : {},
            },
        }).json<Response>();
        return response;
    } catch (error) {
        console.error(error);
        return response!;
    }

}