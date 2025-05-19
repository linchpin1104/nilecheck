"use client";

import { useState } from "react";

export default function AdminCleanupPage() {
  const [phoneNumber, setPhoneNumber] = useState("01052995980");
  const [status, setStatus] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleDeleteUserData = async () => {
    if (!phoneNumber) {
      setStatus("전화번호를 입력해주세요.");
      return;
    }

    setIsLoading(true);
    setStatus("사용자 데이터 삭제 중...");

    try {
      // API 호출로 사용자 데이터 삭제
      const response = await fetch("/api/clear-test-data", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ phoneNumber }),
      });

      const result = await response.json();

      if (result.success) {
        setStatus(`${phoneNumber} 사용자 데이터가 성공적으로 삭제되었습니다.`);
      } else {
        setStatus(`오류 발생: ${result.message || "알 수 없는 오류"}`);
      }
    } catch (error) {
      setStatus(`오류 발생: ${error instanceof Error ? error.message : "알 수 없는 오류"}`);
      console.error("데이터 삭제 중 오류 발생:", error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="p-8 max-w-md mx-auto">
      <h1 className="text-2xl font-bold mb-6">사용자 데이터 정리</h1>
      <p className="mb-4 text-gray-600">
        이 페이지는 특정 사용자의 모든 데이터를 삭제합니다. 삭제된 데이터는 복구할 수 없습니다.
      </p>

      <div className="mb-4">
        <label htmlFor="phoneNumber" className="block text-sm font-medium mb-1">
          전화번호
        </label>
        <input
          type="text"
          id="phoneNumber"
          value={phoneNumber}
          onChange={(e) => setPhoneNumber(e.target.value)}
          className="w-full px-3 py-2 border rounded-md"
          placeholder="01012345678 형식으로 입력"
        />
      </div>

      <button
        onClick={handleDeleteUserData}
        disabled={isLoading}
        className="w-full py-2 px-4 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:bg-gray-400"
      >
        {isLoading ? "처리 중..." : "사용자 데이터 삭제"}
      </button>

      {status && (
        <div className="mt-4 p-3 rounded-md bg-gray-100">
          <p>{status}</p>
        </div>
      )}

      <div className="mt-8 pt-4 border-t border-gray-200">
        <h2 className="text-lg font-semibold mb-2">삭제되는 데이터</h2>
        <ul className="list-disc pl-5 space-y-1">
          <li>사용자 계정 정보 (users 컬렉션)</li>
          <li>사용자 앱 데이터 (appData 컬렉션)</li>
          <li>인증 관련 데이터 (verifications 컬렉션)</li>
        </ul>
      </div>
    </div>
  );
} 