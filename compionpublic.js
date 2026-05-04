await prisma.companion.updateMany({
    where: {
        contentRating: "ADULT",
        visibility: "PRIVATE",
    },
    data: {
        visibility: "PUBLIC",
    },
});
