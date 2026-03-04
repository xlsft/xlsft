export const useGithubRepository = async <ResponseData = unknown, Response = ResponseData>(
    endpoint: string
): Promise<Response> => {
    let response: Response
    try {
        response = (await useFetch<Response>(endpoint, {
            baseURL: `/api/repo`,
            responseType: 'json',
        })).data.value as Response
        return response;
    } catch (error) {
        console.error(error);
        return response!;
    }
}