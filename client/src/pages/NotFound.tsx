import { Link } from 'react-router-dom';

const NotFound = () => {
  return (
    <div className="arena-wrap py-24 min-h-[70vh] flex flex-col items-center justify-center text-center">
      <div className="max-w-lg mx-auto">
        <h1 className="display text-primary mb-4">
          404
        </h1>
        
        <div className="h3 uppercase tracking-widest text-ink-200 mb-8">
          Page Not Found
        </div>
        
        <p className="body-l mb-10">
          The page you're looking for doesn't exist or has been moved to another dimension.
        </p>
        
        <div className="flex justify-center">
          <Link to="/" className="btn btn-primary">
            Return to Home
          </Link>
        </div>
      </div>
    </div>
  );
};

export default NotFound;
