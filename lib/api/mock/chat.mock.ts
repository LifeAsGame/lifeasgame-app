// Mock chat message history per followId (social-friend-001 through social-friend-010)

export type MockChatMessage = {
  id: string;
  sender: "me" | "them";
  text: string;
  time: string;
};

export const MOCK_CHAT_HISTORY: Record<string, MockChatMessage[]> = {
  "social-friend-001": [
    { id: "a1", sender: "them", text: "어제 보스 레이드 어땠어?", time: "14:20" },
    { id: "a2", sender: "me", text: "엄청 힘들었어. 25층 보스 겨우 클리어했다ㅠ", time: "14:22" },
    { id: "a3", sender: "them", text: "고생했어! 나도 같이 갔으면 좋았을 텐데", time: "14:23" },
    { id: "a4", sender: "me", text: "다음엔 같이 가자 ㅎㅎ", time: "14:24" },
    { id: "a5", sender: "them", text: "응 꼭! 다음 레이드 언제야?", time: "14:25" },
  ],
  "social-friend-002": [
    { id: "b1", sender: "them", text: "야 파티 합류할래? 지금 30층 던전 들어가려는데", time: "09:10" },
    { id: "b2", sender: "me", text: "지금 바로 갈게! 어디서 만나?", time: "09:12" },
    { id: "b3", sender: "them", text: "30층 서쪽 관문 앞에 있어", time: "09:13" },
  ],
  "social-friend-003": [
    { id: "c1", sender: "me", text: "Agil 형 시장에서 그 철광석 아직 팔아요?", time: "11:00" },
    { id: "c2", sender: "them", text: "응 아직 있어. 얼마나 필요해?", time: "11:05" },
    { id: "c3", sender: "me", text: "100개만 부탁드려요", time: "11:06" },
    { id: "c4", sender: "them", text: "OK 개당 200col로 넘겨줄게 ㅎ", time: "11:08" },
  ],
  "social-friend-004": [
    { id: "d1", sender: "them", text: "새 검 만들어줄게! 소재 가져와봐", time: "16:30" },
    { id: "d2", sender: "me", text: "미스릴 주괴 10개면 돼?", time: "16:32" },
    { id: "d3", sender: "them", text: "딱 좋아! 내일 오전에 공방으로 와", time: "16:33" },
  ],
  "social-friend-005": [
    { id: "e1", sender: "them", text: "오빠! 피나가 새 스킬 배웠어요 ㅎㅎ", time: "10:00" },
    { id: "e2", sender: "me", text: "오 무슨 스킬이야?", time: "10:02" },
    { id: "e3", sender: "them", text: "힐 범위가 넓어지는 스킬이에요! 파티원한테 엄청 좋아요", time: "10:04" },
    { id: "e4", sender: "me", text: "와 대박이다! 다음 파티 때 꼭 써줘", time: "10:05" },
  ],
  "social-friend-006": [
    { id: "f1", sender: "them", text: "오늘 날씨 좋다 어디 날아다닐까", time: "13:00" },
    { id: "f2", sender: "me", text: "같이 ALO에서 날아다닐까요?", time: "13:02" },
    { id: "f3", sender: "them", text: "좋아! 2시에 알브헤임 서쪽 숲 어때?", time: "13:03" },
  ],
  "social-friend-007": [
    { id: "g1", sender: "me", text: "Sinon 씨 오늘 PvP 있어요?", time: "15:10" },
    { id: "g2", sender: "them", text: "응 저녁 7시에 경기장에서 매치 있어", time: "15:12" },
    { id: "g3", sender: "me", text: "응원하러 갈게요!", time: "15:13" },
    { id: "g4", sender: "them", text: "고마워 ㅎㅎ 진짜 와줘!", time: "15:14" },
  ],
  "social-friend-008": [
    { id: "h1", sender: "them", text: "파란 장미 찾으러 같이 가지 않을래?", time: "08:30" },
    { id: "h2", sender: "me", text: "물론이지! 언제 출발해?", time: "08:32" },
    { id: "h3", sender: "them", text: "내일 아침 해 뜰 때 북문 앞에서", time: "08:33" },
  ],
  "social-friend-009": [
    { id: "i1", sender: "them", text: "통합 기사단 가입 생각해봤어?", time: "12:00" },
    { id: "i2", sender: "me", text: "아직 고민 중이에요... 규율이 엄격해서요", time: "12:05" },
    { id: "i3", sender: "them", text: "그래도 전력으로는 최강이야. 같이 싸우고 싶어", time: "12:07" },
  ],
  "social-friend-010": [
    { id: "j1", sender: "them", text: "키리토 군, 오늘 결투 어때?", time: "18:00" },
    { id: "j2", sender: "me", text: "...언제든 받아드리죠. 장소는요?", time: "18:05" },
    { id: "j3", sender: "them", text: "결투장 5번 구역. 검만 들고 와.", time: "18:06" },
  ],
};
