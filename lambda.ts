import * as Sentry from "@sentry/aws-serverless";
import { Context, Handler } from "aws-lambda";
import axios, { AxiosResponse } from "axios";

Sentry.init({
  dsn: "",
  sendDefaultPii: true,
  environment: process.env.DEPLOYMENT_ENVIRONMENT,
});

export const handler: Handler = Sentry.wrapHandler(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async (event: any, context: Context) => {
    context.callbackWaitsForEmptyEventLoop = false;

    const { method, endpoint, payload, headers = {} } = event;

    if (!method) {
      throw new Error("payload에 method 값이 없습니다.");
    }
    if (!endpoint) {
      throw new Error("payload에 endpoint 값이 없습니다.");
    }

    try {
      // 기본 헤더 설정
      const defaultHeaders = {
        "User-Agent": "Fan-Platform-Lambda/1.0",
        Accept: "application/json, text/html, */*",
        "Accept-Language": "ko-KR,ko;q=0.9,en;q=0.8",
        "Cache-Control": "no-cache",
        Pragma: "no-cache",
        ...headers,
      };

      console.log(`🚀 [${method.toUpperCase()}] ${endpoint} 호출 시작`);
      console.log(`📋 Headers:`, JSON.stringify(defaultHeaders, null, 2));

      const response: AxiosResponse = await axios.request({
        method: method.toLowerCase(),
        url: endpoint,
        data: method.toLowerCase() === "get" ? undefined : payload,
        headers: defaultHeaders,
        timeout: 30000, // 30초 타임아웃
        validateStatus: (status) => status < 500, // 5xx 에러만 예외로 처리
      });

      console.log(
        `✅ [${method.toUpperCase()}] ${endpoint} 호출 성공 (Status: ${response.status})`,
      );

      return {
        statusCode: 200,
        body: {
          success: true,
          status: response.status,
          statusText: response.statusText,
          headers: response.headers,
          data: response.data,
        },
      };

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (err: any) {
      console.error(
        `❌ [${method.toUpperCase()}] ${endpoint} 호출 실패:`,
        err.message,
      );

      if (err.response) {
        console.error(`📄 Response Status: ${err.response.status}`);
        console.error(
          `📄 Response Headers:`,
          JSON.stringify(err.response.headers, null, 2),
        );
        console.error(`📄 Response Data:`, err.response.data);

        return {
          statusCode: 200,
          body: {
            success: false,
            error: {
              status: err.response.status,
              statusText: err.response.statusText,
              headers: err.response.headers,
              data: err.response.data,
            },
          },
        };
      }

      throw err;
    }
  },
);
