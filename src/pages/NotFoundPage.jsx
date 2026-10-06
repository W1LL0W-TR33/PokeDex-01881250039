import { Link } from "react-router-dom";
function NotFoundPage() {
 return (
 <div className="status">
 <p>There's nothing here.</p>
 <Link to="/" className="back-link">← Back to list</Link>
 </div>
 );
}
export default NotFoundPage;