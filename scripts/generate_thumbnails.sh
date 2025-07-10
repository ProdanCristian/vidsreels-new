#!/bin/bash

# Script to generate WebP thumbnails from videos in vertical format
# Usage: ./scripts/generate_thumbnails.sh [--retry-failed]

# Configuration
VIDEO_DIR="/Users/Cristian_1/Desktop/VidsReels Luxury Videos"
THUMBNAIL_DIR="$VIDEO_DIR/thumbnails"
FAILED_LOG="$THUMBNAIL_DIR/failed_videos.log"
THUMBNAIL_WIDTH=360
THUMBNAIL_HEIGHT=640
QUALITY=85

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if ffmpeg is installed
check_ffmpeg() {
    if ! command -v ffmpeg &> /dev/null; then
        print_error "ffmpeg is not installed. Please install it first:"
        print_error "  macOS: brew install ffmpeg"
        print_error "  Linux: sudo apt-get install ffmpeg"
        exit 1
    fi
}

# Create thumbnail directory if it doesn't exist
create_thumbnail_dir() {
    if [ ! -d "$THUMBNAIL_DIR" ]; then
        mkdir -p "$THUMBNAIL_DIR"
        print_status "Created thumbnail directory: $THUMBNAIL_DIR"
    fi
}

# Check if video directory exists
check_video_dir() {
    if [ ! -d "$VIDEO_DIR" ]; then
        print_error "Video directory not found: $VIDEO_DIR"
        print_error "Please make sure the directory exists and try again."
        exit 1
    fi
}

# Get video duration in seconds (with decimals)
get_video_duration() {
    local video_file="$1"
    ffprobe -v quiet -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "$video_file" 2>/dev/null
}

# Get video info
get_video_info() {
    local video_file="$1"
    ffprobe -v quiet -select_streams v:0 -show_entries stream=width,height,duration,codec_name -of csv=p=0 "$video_file" 2>/dev/null
}

# Log failed video
log_failed_video() {
    local video_file="$1"
    local error_msg="$2"
    echo "$(date '+%Y-%m-%d %H:%M:%S') - $(basename "$video_file") - $error_msg" >> "$FAILED_LOG"
}

# Generate thumbnail from video with multiple fallback strategies
generate_thumbnail() {
    local video_file="$1"
    local video_name=$(basename "$video_file")
    local video_name_no_ext="${video_name%.*}"
    local thumbnail_file="$THUMBNAIL_DIR/${video_name_no_ext}.webp"
    
    print_status "Processing: $video_name"
    
    # Skip if thumbnail already exists (for retry mode)
    if [ -f "$thumbnail_file" ]; then
        print_status "Thumbnail already exists: ${video_name_no_ext}.webp"
        return 0
    fi
    
    # Get video info
    local video_info=$(get_video_info "$video_file")
    if [ -z "$video_info" ]; then
        print_error "Could not read video info for $video_name"
        log_failed_video "$video_file" "Cannot read video info"
        return 1
    fi
    
    # Parse video info
    local codec=$(echo "$video_info" | cut -d',' -f1)
    local width=$(echo "$video_info" | cut -d',' -f2)
    local height=$(echo "$video_info" | cut -d',' -f3)
    local duration=$(echo "$video_info" | cut -d',' -f4)
    
    if [ -z "$duration" ] || [ "$duration" = "N/A" ]; then
        print_warning "No duration info for $video_name, using fallback method"
        duration=1.0
    fi
    
    # Convert duration to a usable number
    local duration_int=$(echo "$duration" | cut -d'.' -f1)
    if [ -z "$duration_int" ] || [ "$duration_int" -eq 0 ]; then
        duration_int=1
    fi
    
    # Try multiple timestamps for thumbnail extraction
    local timestamps=()
    
    # Strategy 1: Middle of video (but not less than 0.5 seconds)
    local middle_time=$(echo "$duration / 2" | bc -l 2>/dev/null || echo "0.5")
    local middle_int=$(echo "$middle_time" | cut -d'.' -f1)
    if [ -z "$middle_int" ] || [ "$middle_int" -eq 0 ]; then
        middle_time="0.5"
    fi
    timestamps+=("$middle_time")
    
    # Strategy 2: 10% into video
    local early_time=$(echo "$duration * 0.1" | bc -l 2>/dev/null || echo "0.1")
    if [ "$(echo "$early_time < 0.1" | bc -l 2>/dev/null)" = "1" ]; then
        early_time="0.1"
    fi
    timestamps+=("$early_time")
    
    # Strategy 3: 90% into video  
    local late_time=$(echo "$duration * 0.9" | bc -l 2>/dev/null || echo "0.5")
    timestamps+=("$late_time")
    
    # Strategy 4: Very beginning
    timestamps+=("0.1")
    
    # Strategy 5: 1 second mark
    if [ "$(echo "$duration > 1" | bc -l 2>/dev/null)" = "1" ]; then
        timestamps+=("1.0")
    fi
    
    # Try each timestamp until one works
    for timestamp in "${timestamps[@]}"; do
        print_status "Trying timestamp: $timestamp for $video_name"
        
        # Create thumbnail with current timestamp
        if ffmpeg -hide_banner -loglevel error -i "$video_file" \
            -ss "$timestamp" -vframes 1 \
            -vf "scale=w=$THUMBNAIL_WIDTH:h=$THUMBNAIL_HEIGHT:force_original_aspect_ratio=decrease,pad=$THUMBNAIL_WIDTH:$THUMBNAIL_HEIGHT:(ow-iw)/2:(oh-ih)/2:black" \
            -f webp -quality "$QUALITY" \
            "$thumbnail_file" -y 2>/dev/null; then
            
            # Verify the thumbnail was created and is not corrupted
            if [ -f "$thumbnail_file" ] && [ -s "$thumbnail_file" ]; then
                # Quick validation using ffprobe
                if ffprobe -v quiet -select_streams v:0 -show_entries stream=width,height -of csv=p=0 "$thumbnail_file" &>/dev/null; then
                    print_success "Generated: ${video_name_no_ext}.webp (timestamp: $timestamp)"
                    return 0
                else
                    print_warning "Corrupted thumbnail detected for $video_name at timestamp $timestamp, trying next..."
                    rm -f "$thumbnail_file"
                fi
            fi
        fi
    done
    
    # If all timestamps failed, try without seeking (first frame)
    print_status "Trying first frame extraction for $video_name"
    if ffmpeg -hide_banner -loglevel error -i "$video_file" \
        -vframes 1 \
        -vf "scale=w=$THUMBNAIL_WIDTH:h=$THUMBNAIL_HEIGHT:force_original_aspect_ratio=decrease,pad=$THUMBNAIL_WIDTH:$THUMBNAIL_HEIGHT:(ow-iw)/2:(oh-ih)/2:black" \
        -f webp -quality "$QUALITY" \
        "$thumbnail_file" -y 2>/dev/null; then
        
        if [ -f "$thumbnail_file" ] && [ -s "$thumbnail_file" ]; then
            if ffprobe -v quiet -select_streams v:0 -show_entries stream=width,height -of csv=p=0 "$thumbnail_file" &>/dev/null; then
                print_success "Generated: ${video_name_no_ext}.webp (first frame)"
                return 0
            else
                rm -f "$thumbnail_file"
            fi
        fi
    fi
    
    # Final fallback: try with different video filter
    print_status "Trying simplified extraction for $video_name"
    if ffmpeg -hide_banner -loglevel error -i "$video_file" \
        -vframes 1 \
        -vf "scale=360:640:force_original_aspect_ratio=decrease" \
        -f webp -quality "$QUALITY" \
        "$thumbnail_file" -y 2>/dev/null; then
        
        if [ -f "$thumbnail_file" ] && [ -s "$thumbnail_file" ]; then
            if ffprobe -v quiet -select_streams v:0 -show_entries stream=width,height -of csv=p=0 "$thumbnail_file" &>/dev/null; then
                print_success "Generated: ${video_name_no_ext}.webp (simplified)"
                return 0
            else
                rm -f "$thumbnail_file"
            fi
        fi
    fi
    
    print_error "All methods failed for $video_name"
    log_failed_video "$video_file" "All extraction methods failed - codec: $codec, duration: $duration, resolution: ${width}x${height}"
    return 1
}

# Main function
main() {
    local retry_mode=false
    
    # Check for retry flag
    if [ "$1" = "--retry-failed" ]; then
        retry_mode=true
        print_status "Running in retry mode - will only process failed videos"
    fi
    
    print_status "Starting thumbnail generation..."
    print_status "Video directory: $VIDEO_DIR"
    print_status "Thumbnail directory: $THUMBNAIL_DIR"
    print_status "Target size: ${THUMBNAIL_WIDTH}x${THUMBNAIL_HEIGHT}"
    print_status "Quality: $QUALITY"
    echo
    
    # Check dependencies and directories
    check_ffmpeg
    check_video_dir
    create_thumbnail_dir
    
    # Initialize failed log
    if [ "$retry_mode" = false ]; then
        > "$FAILED_LOG"  # Clear the log
    fi
    
    # Find all video files
    local video_files=()
    if [ "$retry_mode" = true ] && [ -f "$FAILED_LOG" ]; then
        # Read failed videos from log
        while IFS= read -r line; do
            if [ -n "$line" ]; then
                local video_name=$(echo "$line" | cut -d' ' -f4)
                local video_path="$VIDEO_DIR/$video_name"
                if [ -f "$video_path" ]; then
                    video_files+=("$video_path")
                fi
            fi
        done < "$FAILED_LOG"
        print_status "Found ${#video_files[@]} previously failed videos to retry"
    else
        # Find all videos normally
        while IFS= read -r -d '' file; do
            video_files+=("$file")
        done < <(find "$VIDEO_DIR" -maxdepth 1 -type f \( -iname "*.mp4" -o -iname "*.avi" -o -iname "*.mov" -o -iname "*.mkv" -o -iname "*.wmv" -o -iname "*.flv" -o -iname "*.webm" -o -iname "*.m4v" \) -print0)
        print_status "Found ${#video_files[@]} video files"
    fi
    
    if [ ${#video_files[@]} -eq 0 ]; then
        print_warning "No video files found"
        exit 0
    fi
    
    echo
    
    # Process each video file
    local success_count=0
    local fail_count=0
    
    for video_file in "${video_files[@]}"; do
        if generate_thumbnail "$video_file"; then
            ((success_count++))
        else
            ((fail_count++))
        fi
    done
    
    echo
    print_status "Thumbnail generation completed!"
    print_success "Successfully generated: $success_count thumbnails"
    
    if [ "$fail_count" -gt 0 ]; then
        print_warning "Failed to generate: $fail_count thumbnails"
        print_status "Failed videos logged to: $FAILED_LOG"
        print_status "To retry failed videos, run: $0 --retry-failed"
    fi
    
    print_status "Thumbnails saved to: $THUMBNAIL_DIR"
}

# Run main function
main "$@" 