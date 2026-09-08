const getReviewStatus = (id) => {
  if (id % 3 === 0) return "rejected";
  if (id % 2 === 0) return "approved";
  return "pending";
};

export const reviewCreatives = (creatives) =>
  creatives.map((creative) => {
    const status = getReviewStatus(creative.id);
    return {
      id: creative.id,
      title: status === "rejected"
        ? creative.title.toUpperCase()
        : creative.title,
      status
    };
  });
