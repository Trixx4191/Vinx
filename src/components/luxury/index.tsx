/**
 * LUXURY COMPONENT LIBRARY
 * Based on Prada design system analysis + Vinx soft aesthetic
 *
 * Location: src/components/luxury/index.tsx
 * Import: import { Button, ProductCard, ... } from '@/components/luxury';
 */

import React from 'react';
import Image from 'next/image';

// ============================================================================
// 1. BUTTON COMPONENTS
// ============================================================================

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'link';
  size?: 'sm' | 'md' | 'lg';
  fullWidth?: boolean;
  loading?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant = 'primary',
      size = 'md',
      fullWidth = false,
      loading = false,
      disabled = false,
      className = '',
      children,
      ...props
    },
    ref
  ) => {
    const baseStyles = 'font-semibold uppercase tracking-widest transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed';

    const variants = {
      primary: 'bg-black text-white border-2 border-black hover:bg-gray-800 hover:border-gray-800 active:bg-black',
      secondary: 'bg-transparent text-black border-2 border-black hover:bg-gray-100 active:bg-gray-200',
      link: 'bg-transparent text-black border-b border-black border-solid hover:opacity-70 active:opacity-50 px-0',
    };

    const sizes = {
      sm: 'px-4 py-2 text-sm',
      md: 'px-10 py-4 text-base',
      lg: 'px-12 py-5 text-lg',
    };

    return (
      <button
        ref={ref}
        disabled={disabled || loading}
        className={`
          ${baseStyles}
          ${variants[variant]}
          ${sizes[size]}
          ${fullWidth ? 'w-full' : ''}
          ${className}
        `}
        {...props}
      >
        {loading ? (
          <span className="inline-flex items-center gap-2">
            <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
            {children}
          </span>
        ) : (
          children
        )}
      </button>
    );
  }
);

Button.displayName = 'Button';

// ============================================================================
// 2. PRODUCT CARD
// ============================================================================

interface ProductCardProps {
  id: string;
  title: string;
  collection: string;
  price: number;
  description?: string;
  image: string;
  imageAlt: string;
  video?: string;
  onClick?: () => void;
}

export const ProductCard: React.FC<ProductCardProps> = ({
  id,
  title,
  collection,
  price,
  description,
  image,
  imageAlt,
  video,
  onClick,
}) => {
  const [isVideoPlaying, setIsVideoPlaying] = React.useState(false);

  return (
    <article
      className="product-card-luxury flex flex-col bg-white"
      onClick={onClick}
    >
      {/* Image & Video Container */}
      <div className="relative w-full aspect-square overflow-hidden bg-gray-100 group">
        {/* Image */}
        <Image
          src={image}
          alt={imageAlt}
          fill
          className="object-cover w-full h-full group-hover:opacity-0 transition-opacity duration-300"
          priority
        />

        {/* Video (hover) */}
        {video && (
          <video
            autoPlay
            muted
            loop
            playsInline
            className="absolute inset-0 w-full h-full object-cover opacity-0 group-hover:opacity-100 transition-opacity duration-300"
            onMouseEnter={() => setIsVideoPlaying(true)}
            onMouseLeave={() => setIsVideoPlaying(false)}
          >
            <source src={video} type="video/mp4" />
          </video>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 flex flex-col justify-start p-6">
        {/* Collection Label */}
        <p className="text-label text-gray-500 mb-2">{collection}</p>

        {/* Product Title */}
        <h3 className="text-body-lg font-luxury font-medium mb-2 line-clamp-2 leading-snug">
          {title}
        </h3>

        {/* Price */}
        <p className="text-body-md font-semibold text-black mb-2">
          ${(price / 100).toFixed(2)}
        </p>

        {/* Description */}
        {description && (
          <p className="text-body-sm text-gray-500 line-clamp-2">
            {description}
          </p>
        )}
      </div>
    </article>
  );
};

// ============================================================================
// 3. IMAGE GALLERY WITH THUMBNAIL SELECTOR
// ============================================================================

interface ImageGalleryProps {
  images: Array<{ src: string; alt: string }>;
  videos?: Array<{ src: string; alt: string }>;
  onImageChange?: (index: number) => void;
}

export const ImageGallery: React.FC<ImageGalleryProps> = ({
  images,
  videos,
  onImageChange,
}) => {
  const [mainImageIndex, setMainImageIndex] = React.useState(0);
  const [showVideo, setShowVideo] = React.useState(false);

  const handleThumbnailClick = (index: number) => {
    setMainImageIndex(index);
    setShowVideo(false);
    onImageChange?.(index);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
      {/* Main Image/Video */}
      <div className="lg:col-span-4">
        <div className="relative aspect-square bg-gray-100 overflow-hidden">
          {showVideo && videos?.[mainImageIndex] ? (
            <video
              src={videos[mainImageIndex].src}
              alt={videos[mainImageIndex].alt}
              autoPlay
              muted
              loop
              playsInline
              className="w-full h-full object-cover"
            />
          ) : (
            <Image
              src={images[mainImageIndex].src}
              alt={images[mainImageIndex].alt}
              fill
              className="w-full h-full object-cover"
              priority
            />
          )}
        </div>
      </div>

      {/* Thumbnails */}
      <div className="flex lg:flex-col gap-3 overflow-x-auto lg:overflow-x-visible">
        {/* Image Thumbnails */}
        {images.map((img, idx) => (
          <button
            key={`img-${idx}`}
            onClick={() => handleThumbnailClick(idx)}
            className={`flex-shrink-0 w-20 h-20 lg:w-24 lg:h-24 border-2 transition-colors duration-300 overflow-hidden ${
              mainImageIndex === idx && !showVideo
                ? 'border-black'
                : 'border-gray-200 hover:border-gray-400'
            }`}
          >
            <Image
              src={img.src}
              alt={img.alt}
              width={96}
              height={96}
              className="w-full h-full object-cover"
            />
          </button>
        ))}

        {/* Video Thumbnail */}
        {videos?.[mainImageIndex] && (
          <button
            onClick={() => setShowVideo(!showVideo)}
            className={`flex-shrink-0 w-20 h-20 lg:w-24 lg:h-24 border-2 bg-black transition-colors duration-300 flex items-center justify-center ${
              showVideo ? 'border-black' : 'border-gray-200 hover:border-gray-400'
            }`}
          >
            <svg className="w-8 h-8 text-white" fill="currentColor" viewBox="0 0 24 24">
              <path d="M8 5v14l11-7z" />
            </svg>
          </button>
        )}
      </div>
    </div>
  );
};

// ============================================================================
// 4. FORM INPUTS
// ============================================================================

interface FormGroupProps {
  label: string;
  required?: boolean;
  error?: string;
  children: React.ReactNode;
}

export const FormGroup: React.FC<FormGroupProps> = ({
  label,
  required = false,
  error,
  children,
}) => {
  return (
    <div className="mb-8">
      <label className="block text-label text-black mb-3">
        {label}
        {required && <span className="text-red-600 ml-1">*</span>}
      </label>
      {children}
      {error && <p className="text-body-sm text-red-600 mt-2">{error}</p>}
    </div>
  );
};

interface FormInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export const FormInput = React.forwardRef<HTMLInputElement, FormInputProps>(
  ({ label, error, className = '', ...props }, ref) => (
    <FormGroup label={label || ''} error={error}>
      <input
        ref={ref}
        className={`
          form-input-luxury
          ${error ? 'border-red-600' : ''}
          ${className}
        `}
        {...props}
      />
    </FormGroup>
  )
);

FormInput.displayName = 'FormInput';

interface FormSelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  options: Array<{ value: string; label: string }>;
}

export const FormSelect = React.forwardRef<HTMLSelectElement, FormSelectProps>(
  ({ label, error, options, className = '', ...props }, ref) => (
    <FormGroup label={label || ''} error={error}>
      <select
        ref={ref}
        className={`
          form-select-luxury
          ${error ? 'border-red-600' : ''}
          ${className}
        `}
        {...props}
      >
        <option value="">Select an option</option>
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </FormGroup>
  )
);

FormSelect.displayName = 'FormSelect';

interface FormTextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
}

export const FormTextarea = React.forwardRef<HTMLTextAreaElement, FormTextareaProps>(
  ({ label, error, className = '', ...props }, ref) => (
    <FormGroup label={label || ''} error={error}>
      <textarea
        ref={ref}
        className={`
          form-textarea-luxury
          min-h-[120px] resize-vertical
          ${error ? 'border-red-600' : ''}
          ${className}
        `}
        {...props}
      />
    </FormGroup>
  )
);

FormTextarea.displayName = 'FormTextarea';

// ============================================================================
// 5. SKELETON LOADING COMPONENT
// ============================================================================

interface SkeletonProps {
  className?: string;
  width?: string | number;
  height?: string | number;
}

export const Skeleton: React.FC<SkeletonProps> = ({
  className = '',
  width = '100%',
  height = '100%',
}) => (
  <div
    className={`skeleton-loading ${className}`}
    style={{ width, height }}
  />
);

// ============================================================================
// 6. PRODUCT SKELETON CARD
// ============================================================================

export const ProductCardSkeleton: React.FC = () => (
  <article className="product-card-luxury flex flex-col bg-white">
    <Skeleton className="w-full aspect-square mb-6" />
    <div className="px-6 pb-6">
      <Skeleton className="h-4 w-24 mb-3" />
      <Skeleton className="h-6 w-3/4 mb-3" />
      <Skeleton className="h-6 w-1/2 mb-3" />
      <Skeleton className="h-4 w-full" />
    </div>
  </article>
);

// ============================================================================
// 7. PRODUCT GRID
// ============================================================================

interface ProductGridProps {
  children: React.ReactNode;
  columns?: 2 | 3 | 4;
}

export const ProductGrid: React.FC<ProductGridProps> = ({
  children,
  columns = 4,
}) => {
  const colClasses = {
    2: 'grid-luxury-cols-2',
    3: 'grid-luxury-cols-3',
    4: 'grid-luxury-cols-4',
  };

  return (
    <div className={`grid-luxury ${colClasses[columns]}`}>
      {children}
    </div>
  );
};

// ============================================================================
// 8. SECTION CONTAINER
// ============================================================================

interface SectionProps {
  children: React.ReactNode;
  className?: string;
  maxWidth?: 'container' | 'full';
}

export const Section: React.FC<SectionProps> = ({
  children,
  className = '',
  maxWidth = 'container',
}) => (
  <section
    className={`
      section-luxury
      ${maxWidth === 'container' ? 'container-luxury' : 'w-full'}
      ${className}
    `}
  >
    {children}
  </section>
);

// ============================================================================
// 9. BADGE / COLLECTION LABEL
// ============================================================================

interface BadgeProps {
  children: React.ReactNode;
  variant?: 'default' | 'accent' | 'success' | 'warning' | 'error';
}

export const Badge: React.FC<BadgeProps> = ({ children, variant = 'default' }) => {
  const variants = {
    default: 'bg-gray-200 text-gray-800',
    accent: 'bg-celadon text-gray-900',
    success: 'bg-green-600 text-white',
    warning: 'bg-amber-600 text-white',
    error: 'bg-red-600 text-white',
  };

  return (
    <span className={`inline-block px-3 py-1 text-label rounded-none ${variants[variant]}`}>
      {children}
    </span>
  );
};

// ============================================================================
// 10. PRICE DISPLAY COMPONENT
// ============================================================================

interface PriceProps {
  amount: number; // In cents/minor units
  currency?: 'USD' | 'EUR' | 'GBP' | 'GHS';
  size?: 'sm' | 'md' | 'lg';
  original?: number;
}

export const Price: React.FC<PriceProps> = ({
  amount,
  currency = 'USD',
  size = 'md',
  original,
}) => {
  const formattedPrice = (amount / 100).toFixed(2);
  const formattedOriginal = original ? (original / 100).toFixed(2) : null;

  const sizes = {
    sm: 'text-body-sm',
    md: 'text-body-md',
    lg: 'text-h5',
  };

  const currencySymbols = {
    USD: '$',
    EUR: '€',
    GBP: '£',
    GHS: '₵',
  };

  return (
    <div>
      <div className={`${sizes[size]} font-semibold text-black`}>
        {currencySymbols[currency]}
        {formattedPrice}
      </div>
      {formattedOriginal && (
        <p className="text-body-sm text-gray-400 line-through">
          {currencySymbols[currency]}
          {formattedOriginal}
        </p>
      )}
    </div>
  );
};

// ============================================================================
// 11. HEADING COMPONENTS (With Luxury Serif)
// ============================================================================

interface HeadingProps {
  level?: 1 | 2 | 3 | 4 | 5 | 6;
  children: React.ReactNode;
  className?: string;
}

export const Heading: React.FC<HeadingProps> = ({
  level = 1,
  children,
  className = '',
}) => {
  const sizes = {
    1: 'text-h1',
    2: 'text-h2',
    3: 'text-h3',
    4: 'text-h4',
    5: 'text-h5',
    6: 'text-h6',
  };

  const Tag = `h${level}` as keyof JSX.IntrinsicElements;

  return (
    <Tag className={`font-luxury font-medium ${sizes[level]} ${className}`}>
      {children}
    </Tag>
  );
};

// ============================================================================
// EXPORT ALL
// ============================================================================

export default {
  Button,
  ProductCard,
  ImageGallery,
  FormGroup,
  FormInput,
  FormSelect,
  FormTextarea,
  Skeleton,
  ProductCardSkeleton,
  ProductGrid,
  Section,
  Badge,
  Price,
  Heading,
};
