import * as Sentry from "@sentry/aws-serverless";
Sentry.init({
  dsn: process.env.SENTRY_DSN,
  sendDefaultPii: true,
  environment: process.env.DEPLOYMENT_ENVIRONMENT,
});
import { Context, Handler } from "aws-lambda";
import axios, { AxiosResponse } from "axios";

interface RequestResult {
  requestIndex: number;
  success: boolean;
  status?: number;
  statusText?: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  headers?: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  data?: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  error?: any;
  duration: number;
}

export const handler: Handler = Sentry.wrapHandler(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async (event: any, context: Context) => {
    context.callbackWaitsForEmptyEventLoop = false;

    const { method, endpoint, payload, headers = {}, count = 1 } = event;

    if (!method) {
      throw new Error("payload에 method 값이 없습니다.");
    }
    if (!endpoint) {
      throw new Error("payload에 endpoint 값이 없습니다.");
    }

    // 기본 헤더 설정
    const defaultHeaders = {
      "User-Agent": "Fan-Platform-Lambda/1.0",
      Accept: "application/json, text/html, */*",
      "Accept-Language": "ko-KR,ko;q=0.9,en;q=0.8",
      "Cache-Control": "no-cache",
      Pragma: "no-cache",
      ...headers,
    };

    console.log(
      `🚀 [${method.toUpperCase()}] ${endpoint} ${count}회 동시 호출 시작`,
    );
    console.log(`📋 Headers:`, JSON.stringify(defaultHeaders, null, 2));

    const startTime = Date.now();

    // 단일 요청을 처리하는 함수
    const executeRequest = async (
      requestIndex: number,
    ): Promise<RequestResult> => {
      const requestStartTime = Date.now();

      try {
        console.log(`📤 요청 ${requestIndex + 1}/${count} 시작`);

        const response: AxiosResponse = await axios.request({
          method: method.toLowerCase(),
          url: endpoint,
          data: method.toLowerCase() === "get" ? undefined : payload,
          headers: defaultHeaders,
          timeout: 30000, // 30초 타임아웃
          validateStatus: (status) => status < 500, // 5xx 에러만 예외로 처리
        });

        const duration = Date.now() - requestStartTime;
        console.log(
          `✅ 요청 ${requestIndex + 1} 성공 (Status: ${response.status}, Duration: ${duration}ms)`,
        );

        return {
          requestIndex: requestIndex + 1,
          success: true,
          status: response.status,
          statusText: response.statusText,
          headers: response.headers,
          data: response.data,
          duration,
        };
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } catch (err: any) {
        const duration = Date.now() - requestStartTime;
        console.error(
          `❌ 요청 ${requestIndex + 1} 실패 (Duration: ${duration}ms):`,
          err.message,
        );

        if (err.response) {
          console.error(`📄 Response Status: ${err.response.status}`);
          console.error(`📄 Response Data:`, err.response.data);

          return {
            requestIndex: requestIndex + 1,
            success: false,
            duration,
            error: {
              status: err.response.status,
              statusText: err.response.statusText,
              headers: err.response.headers,
              data: err.response.data,
            },
          };
        }

        return {
          requestIndex: requestIndex + 1,
          success: false,
          duration,
          error: {
            message: err.message,
            code: err.code,
          },
        };
      }
    };

    try {
      // 모든 요청을 동시에 실행
      const promises = Array.from({ length: count }, (_, index) =>
        executeRequest(index),
      );

      const results = await Promise.all(promises);
      const totalDuration = Date.now() - startTime;

      // 결과 분석
      const successCount = results.filter((r) => r.success).length;
      const failCount = results.filter((r) => !r.success).length;
      const avgDuration =
        results.reduce((sum, r) => sum + r.duration, 0) / results.length;

      console.log(`🏁 전체 요청 완료 (총 시간: ${totalDuration}ms)`);
      console.log(`📊 결과: 성공 ${successCount}회, 실패 ${failCount}회`);
      console.log(`⏱️ 평균 응답 시간: ${avgDuration.toFixed(2)}ms`);

      return {
        statusCode: 200,
        body: {
          summary: {
            totalRequests: count,
            successCount,
            failCount,
            totalDuration,
            avgDuration: Math.round(avgDuration),
            endpoint,
            method: method.toUpperCase(),
          },
          results,
        },
      };
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (err: any) {
      console.error(`💥 예상치 못한 오류 발생:`, err.message);
      throw err;
    }
  },
);
