import axios from "axios";

export default async function handler(req, res) {
  try {
    const SHEET_ID = "1Rok0vH5ZYY1QzV8A3BaLuf6LsiD_VYKspbjlPOUvmvk";
    const SHEET_NAME = "Sheet1";

    const url = `https://opensheet.elk.sh/${SHEET_ID}/${SHEET_NAME}`;
    const response = await axios.get(url);

    res.status(200).json({
      success: true,
      posts: response.data
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to fetch blog posts"
    });
  }
}
