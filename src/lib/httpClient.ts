import axios, { 
  InternalAxiosRequestConfig, 
  AxiosResponse, 
  AxiosError, 
  AxiosInstance 
} from "axios"; 

const baseURL: string = import.meta.env.VITE_Local ;
export const imgUrl: string = import.meta.env.VITE_IMG_URL;
const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;

export const httpClient: AxiosInstance = axios.create({
    baseURL,
    headers: {
        "Content-Type": "application/json",
    },
});

httpClient.interceptors.request.use(
    (config: InternalAxiosRequestConfig): InternalAxiosRequestConfig => {
        const token = localStorage.getItem("userjwttoken");
        if (token && config.headers) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error: AxiosError): Promise<never> => {
        return Promise.reject(error);
    }
);

httpClient.interceptors.response.use(
    (response: AxiosResponse): AxiosResponse => response,
    (error: AxiosError): Promise<never> => {
        if (error.response?.status === 401) {
            localStorage.removeItem("userjwttoken");
            localStorage.removeItem("user");
            window.location.href = "/login";
        }
        return Promise.reject(error);
    }
);

export default httpClient;