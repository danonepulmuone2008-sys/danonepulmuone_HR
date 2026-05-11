"use client";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { useAuth } from "@/components/AuthProvider";
import AppBar from "@/components/AppBar";

const BRAND = "#72BF44";

type ReceiptItem = {
  id: string;
  item_name: string;
  unit_price: number;
  qty: number;
  price: number;
  status: string;
  responded_at: string | null;
  assignee_name: string;
};

type ReceiptDetail = {
  id: string;
  store_name: string | null;
  paid_at: string;
  total_amount: number;
  is_lunch_time: boolean;
  status: string;
  image_path: string | null;
  uploader_name: string;
  items: ReceiptItem[];
};

const STATUS_LABEL: Record<string, { label: string; className: string }> = {
  approved: { label: "승인완료", className: "bg-green-50 text-green-600" },
  pending:  { label: "승인대기", className: "bg-yellow-50 text-yellow-600" },
  rejected: { label: "반려",     className: "bg-red-50 text-red-500" },
};

function fmt(iso: string) {
  const d = new Date(iso);
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, "0")}.${String(d.getDate()).padStart(2, "0")} ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

export default function ReceiptDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const [receipt, setReceipt] = useState<ReceiptDetail | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user || !id) return;

    fetch(`/api/meals/receipts/${id}`, {
      headers: { Authorization: `Bearer ${user.token}` },
    })
      .then((r) => r.json())
      .then((data) => {
        if (data.error) { setLoading(false); return; }
        setReceipt(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [user, id]);

  if (loading) {
    return (
      <div className="flex flex-col min-h-screen bg-gray-50">
        <AppBar title="영수증 상세" />
        <div className="flex-1 flex items-center justify-center">
          <div className="w-5 h-5 border-2 rounded-full animate-spin" style={{ borderColor: BRAND, borderTopColor: "transparent" }} />
        </div>
      </div>
    );
  }

  if (!receipt) {
    return (
      <div className="flex flex-col min-h-screen bg-gray-50">
        <AppBar title="영수증 상세" />
        <div className="flex-1 flex items-center justify-center text-sm text-gray-400">
          영수증을 찾을 수 없습니다
        </div>
      </div>
    );
  }

  const statusInfo = STATUS_LABEL[receipt.status] ?? { label: receipt.status, className: "bg-gray-100 text-gray-500" };
  const isManual = !receipt.image_path || receipt.image_path === "manual";

  return (
    <div className="flex flex-col min-h-screen bg-gray-50">
      <AppBar title="영수증 상세" />

      <div className="flex flex-col gap-3 px-4 pt-4 pb-10">
        {/* 영수증 이미지 (OCR인 경우) */}
        {!isManual && (
          <div className="bg-white rounded-2xl overflow-hidden shadow-sm border border-gray-100">
            <img
              src={`${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/receipts/${receipt.image_path}`}
              alt="영수증"
              className="w-full object-contain max-h-64"
            />
          </div>
        )}

        {/* 기본 정보 */}
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 flex flex-col gap-3">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-base font-bold text-gray-900">
                {receipt.store_name ?? "가맹점 미인식"}
              </p>
              <p className="text-xs text-gray-400 mt-0.5">{fmt(receipt.paid_at)}</p>
            </div>
            <span className={`text-xs font-medium px-2.5 py-1 rounded-full flex-shrink-0 ml-2 ${statusInfo.className}`}>
              {statusInfo.label}
            </span>
          </div>

          <div className="border-t border-gray-50 pt-3 flex flex-col gap-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-400">등록자</span>
              <span className="font-medium text-gray-700">{receipt.uploader_name}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-400">입력 방식</span>
              <span className="font-medium text-gray-700">{isManual ? "수기 입력" : "OCR 인식"}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-400">점심 시간</span>
              <span className={`font-medium ${receipt.is_lunch_time ? "text-green-600" : "text-orange-500"}`}>
                {receipt.is_lunch_time ? "검증 통과" : "시간 외 결제"}
              </span>
            </div>
            <div className="flex justify-between text-sm border-t border-gray-50 pt-2 mt-1">
              <span className="font-semibold text-gray-700">합계</span>
              <span className="font-bold text-gray-900">{receipt.total_amount.toLocaleString()}원</span>
            </div>
          </div>
        </div>

        {/* 항목별 내역 */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100">
            <p className="text-sm font-semibold text-gray-800">항목 내역 ({receipt.items.length}건)</p>
          </div>
          {receipt.items.map((item) => {
            const itemStatus = STATUS_LABEL[item.status] ?? { label: item.status, className: "bg-gray-100 text-gray-500" };
            return (
              <div
                key={item.id}
                className="px-4 py-3.5 border-b border-gray-50 last:border-b-0"
              >
                <div className="flex items-center justify-between mb-1.5">
                  <p className="text-sm font-medium text-gray-800">{item.item_name}</p>
                  <p className="text-sm font-bold text-gray-800">{item.price.toLocaleString()}원</p>
                </div>
                <div className="flex items-center justify-between">
                  <p className="text-xs text-gray-400">담당자: {item.assignee_name}</p>
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${itemStatus.className}`}>
                    {itemStatus.label}
                  </span>
                </div>
                {item.responded_at && (
                  <p className="text-xs text-gray-300 mt-1">{fmt(item.responded_at)} 응답</p>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
