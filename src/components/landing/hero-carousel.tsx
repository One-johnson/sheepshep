"use client";

import { useCallback, useEffect, useState } from "react";
import useEmblaCarousel from "embla-carousel-react";
import Autoplay from "embla-carousel-autoplay";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const carouselSlides = [
  {
    image: "https://images.unsplash.com/photo-1511632765486-a01980e01a18?w=1200&h=600&fit=crop&q=80",
    title: "Manage Your Flock with Ease",
    description: "Comprehensive church management system designed to help shepherds, pastors, and administrators care for their congregation.",
    scripture: "Feed the flock of God which is among you, taking the oversight thereof, not by constraint, but willingly; not for filthy lucre, but of a ready mind; — 1 Peter 5:2 (KJV)",
  },
  {
    image: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=1200&h=600&fit=crop&q=80",
    title: "Track Member Attendance",
    description: "Easily record and monitor member attendance with automated reminders and at-risk member alerts.",
    scripture: "Not forsaking the assembling of ourselves together, as the manner of some is; but exhorting one another: and so much the more, as ye see the day approaching. — Hebrews 10:25 (KJV)",
  },
  {
    image: "https://images.unsplash.com/photo-1529070538774-1843cb3265df?w=1200&h=600&fit=crop&q=80",
    title: "Organize Groups & Events",
    description: "Create and manage groups like bacenta, bible study, choirs, and organize church events seamlessly.",
    scripture: "Behold, how good and how pleasant it is for brethren to dwell together in unity! — Psalm 133:1 (KJV)",
  },
  {
    image: "https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=1200&h=600&fit=crop&q=80",
    title: "Prayer Requests & Reports",
    description: "Facilitate communication between shepherds, pastors, and members through prayer requests and visitation reports.",
    scripture: "Confess your faults one to another, and pray one for another, that ye may be healed. The effectual fervent prayer of a righteous man availeth much. — James 5:16 (KJV)",
  },
];

export function HeroCarousel() {
  const [emblaRef, emblaApi] = useEmblaCarousel(
    { loop: true, duration: 20 },
    [Autoplay({ delay: 5000, stopOnInteraction: false })]
  );
  const [selectedIndex, setSelectedIndex] = useState(0);

  const scrollPrev = useCallback(() => {
    if (emblaApi) emblaApi.scrollPrev();
  }, [emblaApi]);

  const scrollNext = useCallback(() => {
    if (emblaApi) emblaApi.scrollNext();
  }, [emblaApi]);

  const scrollTo = useCallback(
    (index: number) => {
      if (emblaApi) emblaApi.scrollTo(index);
    },
    [emblaApi]
  );

  useEffect(() => {
    if (!emblaApi) return;

    const onSelect = () => {
      setSelectedIndex(emblaApi.selectedScrollSnap());
    };

    emblaApi.on("select", onSelect);
    onSelect();

    return () => {
      emblaApi.off("select", onSelect);
    };
  }, [emblaApi]);

  return (
    <div className="relative w-full overflow-hidden rounded-2xl bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 dark:from-blue-950/20 dark:via-indigo-950/20 dark:to-purple-950/20">
      <div className="embla" ref={emblaRef}>
        <div className="embla__container flex">
          {carouselSlides.map((slide, index) => (
            <div
              key={index}
              className="embla__slide min-w-0 flex-shrink-0 flex-grow-0 basis-full"
            >
              <div className="relative flex h-[500px] md:h-[600px] flex-col items-center justify-center px-8 py-16 text-center overflow-hidden">
                {/* Background Image */}
                <div 
                  className="absolute inset-0 bg-cover bg-center bg-no-repeat"
                  style={{ backgroundImage: `url(${slide.image})` }}
                >
                  <div className="absolute inset-0 bg-gradient-to-br from-black/60 via-black/50 to-black/60 dark:from-black/70 dark:via-black/60 dark:to-black/70" />
                </div>
                <div className="relative z-10 max-w-3xl space-y-6">
                  <h2 className="text-4xl font-bold tracking-tight text-white md:text-5xl lg:text-6xl drop-shadow-lg">
                    {slide.title}
                  </h2>
                  <p className="text-lg text-white/90 md:text-xl drop-shadow-md">
                    {slide.description}
                  </p>
                  <p className="text-base md:text-lg text-white/80 italic drop-shadow-md font-serif">
                    {slide.scripture}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Navigation Buttons - Hidden in development */}
      {/* <Button
        variant="outline"
        size="icon"
        className="absolute left-4 top-1/2 -translate-y-1/2 z-20 h-10 w-10 rounded-full bg-white/90 dark:bg-gray-900/90 backdrop-blur-sm hover:bg-white dark:hover:bg-gray-800"
        onClick={scrollPrev}
        aria-label="Previous slide"
      >
        <ChevronLeft className="h-5 w-5" />
      </Button>
      <Button
        variant="outline"
        size="icon"
        className="absolute right-4 top-1/2 -translate-y-1/2 z-20 h-10 w-10 rounded-full bg-white/90 dark:bg-gray-900/90 backdrop-blur-sm hover:bg-white dark:hover:bg-gray-800"
        onClick={scrollNext}
        aria-label="Next slide"
      >
        <ChevronRight className="h-5 w-5" />
      </Button> */}

      {/* Dots Indicator */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-20 flex gap-2">
        {carouselSlides.map((_, index) => (
          <button
            key={index}
            className={cn(
              "h-2 w-2 rounded-full transition-all",
              index === selectedIndex
                ? "w-8 bg-white dark:bg-gray-100"
                : "bg-white/50 dark:bg-gray-100/50"
            )}
            onClick={() => scrollTo(index)}
            aria-label={`Go to slide ${index + 1}`}
          />
        ))}
      </div>
    </div>
  );
}
