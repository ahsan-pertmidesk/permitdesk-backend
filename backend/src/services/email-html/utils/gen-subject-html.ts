export const genSubjectHtml = (subject: string) => {
  return `<!-- Heading -->
                  <h2
                    style="
                      font-family: 'Montserrat', Verdana, Geneva, Tahoma,
                        sans-serif;
                      font-size: 18px;
                      line-height: 1.4;
                      color: #b8776b;
                      font-weight: 600;
                      text-align: center;
                    "
                  >
                    ${subject}
                  </h2>`;
};
