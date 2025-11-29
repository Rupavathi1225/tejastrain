import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import BlogsManager from "@/components/admin/BlogsManager";
import CategoriesManager from "@/components/admin/CategoriesManager";
import RelatedSearchesManager from "@/components/admin/RelatedSearchesManager";
import WebResultsManager from "@/components/admin/WebResultsManager";
import PreLandingManager from "@/components/admin/PreLandingManager";
import AnalyticsDashboard from "@/components/admin/AnalyticsDashboard";

const Admin = () => {
  return (
    <div className="min-h-screen bg-background p-8">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-4xl font-bold mb-8">Admin Panel</h1>
        
        <Tabs defaultValue="blogs" className="w-full">
          <TabsList className="grid w-full grid-cols-6 mb-8">
            <TabsTrigger value="blogs">Blogs</TabsTrigger>
            <TabsTrigger value="categories">Categories</TabsTrigger>
            <TabsTrigger value="related">Related Searches</TabsTrigger>
            <TabsTrigger value="web-results">Web Results</TabsTrigger>
            <TabsTrigger value="pre-landing">Pre-Landing</TabsTrigger>
            <TabsTrigger value="analytics">Analytics</TabsTrigger>
          </TabsList>

          <TabsContent value="blogs">
            <BlogsManager />
          </TabsContent>

          <TabsContent value="categories">
            <CategoriesManager />
          </TabsContent>

          <TabsContent value="related">
            <RelatedSearchesManager />
          </TabsContent>

          <TabsContent value="web-results">
            <WebResultsManager />
          </TabsContent>

          <TabsContent value="pre-landing">
            <PreLandingManager />
          </TabsContent>

          <TabsContent value="analytics">
            <AnalyticsDashboard />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default Admin;