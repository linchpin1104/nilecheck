"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Loader2, Lightbulb, ListChecks, CheckCircle, AlertTriangle, CalendarDays } from "lucide-react";

export default function WellnessReportPage() {
  const [isLoading, setIsLoading] = useState(false);
  
  // 샘플 리포트 데이터
  const sampleReport = {
    id: "sample-report",
    weekStartDate: "2023-05-01",
    generatedDate: "2023-05-07",
    input: {
      weekStartDate: "2023-05-01",
      dailyCheckins: [],
      weeklyLogSummary: {
        averageSleepHours: 7.2,
        averageSleepQuality: 3.5,
        mealsLoggedCount: 15,
      },
      userLanguage: "ko"
    },
    output: {
      overallSummary: "지난 주 생활 패턴을 분석한 결과, 전반적으로 양호한 수면 시간과 규칙적인 식사 패턴을 유지하고 있습니다. 스트레스 관리에 조금 더 신경쓰면 더 나은 웰빙 상태를 유지할 수 있을 것입니다.",
      positiveObservations: [
        "평균 7.2시간의 충분한 수면을 취하고 있습니다.",
        "규칙적인 식사 습관을 유지하고 있습니다.",
        "자녀와의 대화 시간을 꾸준히 가지고 있습니다."
      ],
      areasForAttention: [
        "스트레스 수준이 간헐적으로 높게 나타납니다.",
        "개인 시간 확보가 부족합니다.",
        "수면 중 깨는 빈도가 증가하고 있습니다."
      ],
      actionableAdvice: [
        "10분 명상을 아침 루틴에 추가해보세요.",
        "자녀와 함께하는 가벼운 운동 시간을 마련해보세요.",
        "취침 전 스크린 사용을 줄이고 독서나 스트레칭을 대신해보세요.",
        "주 1회는 배우자와 함께 양육 책임을 공유하며 개인 시간을 가져보세요."
      ]
    }
  };

  const handleGenerateReport = () => {
    setIsLoading(true);
    
    // 실제 구현에서는 API 호출 등을 통해 리포트 생성
    setTimeout(() => {
      setIsLoading(false);
    }, 2000);
  };
  
  return (
    <div className="container mx-auto py-8 px-4">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
        <h1 className="text-3xl font-bold text-primary">웰니스 솔루션</h1>
        <Button onClick={handleGenerateReport} disabled={isLoading}>
          {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {isLoading ? "리포트 생성 중..." : "새 리포트 생성하기"}
        </Button>
      </div>

      {isLoading && (
        <Card className="shadow-lg">
          <CardContent className="pt-6 text-center">
            <Loader2 className="mx-auto h-12 w-12 animate-spin text-primary mb-4" />
            <p className="text-muted-foreground">리포트를 생성하는 중입니다...</p>
          </CardContent>
        </Card>
      )}

      {!isLoading && (
        <>
          {/* 샘플 리포트 카드 */}
          <Card className="mb-8">
            <CardHeader>
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle className="text-xl flex items-center gap-2">
                    <Lightbulb className="h-5 w-5 text-primary" /> 주간 웰니스 리포트
                  </CardTitle>
                  <CardDescription className="flex items-center mt-1">
                    <CalendarDays className="h-4 w-4 mr-1" />
                    {new Date(sampleReport.weekStartDate).toLocaleDateString()} - {new Date(sampleReport.generatedDate).toLocaleDateString()}
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="mb-6">
                <h3 className="text-lg font-medium mb-2">전체 요약</h3>
                <p className="text-muted-foreground">{sampleReport.output.overallSummary}</p>
              </div>
              
              <Accordion type="single" collapsible className="mb-4">
                <AccordionItem value="positive">
                  <AccordionTrigger className="flex gap-2 text-green-600">
                    <CheckCircle className="h-5 w-5" />
                    <span className="font-medium">긍정적인 관찰</span>
                  </AccordionTrigger>
                  <AccordionContent>
                    <ul className="list-disc pl-6 space-y-1 text-muted-foreground">
                      {sampleReport.output.positiveObservations.map((item, index) => (
                        <li key={index}>{item}</li>
                      ))}
                    </ul>
                  </AccordionContent>
                </AccordionItem>
                
                <AccordionItem value="attention">
                  <AccordionTrigger className="flex gap-2 text-amber-600">
                    <AlertTriangle className="h-5 w-5" />
                    <span className="font-medium">주의가 필요한 영역</span>
                  </AccordionTrigger>
                  <AccordionContent>
                    <ul className="list-disc pl-6 space-y-1 text-muted-foreground">
                      {sampleReport.output.areasForAttention.map((item, index) => (
                        <li key={index}>{item}</li>
                      ))}
                    </ul>
                  </AccordionContent>
                </AccordionItem>
                
                <AccordionItem value="advice">
                  <AccordionTrigger className="flex gap-2 text-blue-600">
                    <ListChecks className="h-5 w-5" />
                    <span className="font-medium">실행 가능한 조언</span>
                  </AccordionTrigger>
                  <AccordionContent>
                    <ul className="list-disc pl-6 space-y-1 text-muted-foreground">
                      {sampleReport.output.actionableAdvice.map((item, index) => (
                        <li key={index}>{item}</li>
                      ))}
                    </ul>
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
              
              <div className="mt-4 p-4 bg-blue-50 rounded-lg border border-blue-100">
                <h3 className="text-sm font-medium flex items-center gap-2 text-blue-800 mb-2">
                  <Lightbulb className="h-4 w-4" /> 알고 계셨나요?
                </h3>
                <p className="text-sm text-blue-700">규칙적인 수면 패턴은 아이들의 정서적 안정감과 인지 발달에도 좋은 영향을 미칩니다. 부모가 건강한 생활 루틴을 유지하면 자녀들에게도 긍정적인 영향을 줍니다.</p>
              </div>
            </CardContent>
            <CardFooter className="border-t pt-4">
              <p className="text-xs text-muted-foreground">이 리포트는 지난 7일간 기록된 데이터를 기반으로 생성되었습니다.</p>
            </CardFooter>
          </Card>
        </>
      )}
    </div>
  );
} 